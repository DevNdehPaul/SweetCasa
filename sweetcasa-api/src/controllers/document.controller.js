const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const streamifier = require('streamifier')
const { sendMail } = require('../lib/email')
const { logAction } = require('../lib/audit')
const { createNotification } = require('../services/notification.service')

const ALLOWED_TYPES = ['LEGAL_DOCUMENT', 'FLOOR_PLAN', 'NATIONAL_ID', 'OTHER']

function normalizeType(type) {
  const normalized = String(type || '').toUpperCase()
  return ALLOWED_TYPES.includes(normalized) ? normalized : 'OTHER'
}

function serializeDocument(doc) {
  return {
    id: doc.id,
    listingId: doc.listingId,
    userId: doc.userId,
    type: doc.type,
    fileName: doc.fileName,
    url: doc.url,
    status: doc.status,
    reviewedBy: doc.reviewedBy,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    listing: doc.listing
      ? { id: doc.listing.id, title: doc.listing.title, status: doc.listing.status }
      : undefined,
    uploader: doc.user ? { id: doc.user.id, name: doc.user.name, email: doc.user.email } : undefined,
  }
}

async function uploadBufferToCloudinary(file, folder) {
  const isPdf = file.mimetype === 'application/pdf'
  const uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isPdf ? 'raw' : 'image',
        use_filename: true,
        unique_filename: true,
        ...(isPdf && { format: file.originalname?.split('.').pop()?.toLowerCase() || undefined }),
      },
      (error, result) => (error ? reject(error) : resolve(result))
    )
    streamifier.createReadStream(file.buffer).pipe(stream)
  })

  return { url: uploaded.secure_url, publicId: uploaded.public_id }
}

// ── POST /listings/:id/documents — owner uploads a document to their listing's vault ──
exports.uploadDocument = async (req, res) => {
  try {
    ensureCloudinaryConfigured()
    const listingId = Number.parseInt(req.params.id, 10)
    if (!listingId) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findFirst({ where: { id: listingId, ownerId: req.user.id } })
    if (!listing) return res.status(404).json({ error: 'Listing not found or access denied.' })

    if (!req.file) return res.status(400).json({ error: 'A file is required.' })

    const uploaded = await uploadBufferToCloudinary(req.file, 'sweetcasa/listings/legal-documents')

    const doc = await getPrisma().document.create({
      data: {
        listingId,
        userId: req.user.id,
        type: normalizeType(req.body.type),
        fileName: req.file.originalname || null,
        url: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        status: 'Pending',
      },
    })

    res.status(201).json({ document: serializeDocument(doc) })
  } catch (err) {
    console.error('Upload document error:', err)
    res.status(500).json({ error: err.message || 'Failed to upload document.' })
  }
}

// ── GET /listings/:id/documents — owner or admin views a listing's vault ──
exports.getDocumentsForListing = async (req, res) => {
  try {
    const listingId = Number.parseInt(req.params.id, 10)
    if (!listingId) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findUnique({ where: { id: listingId } })
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })

    const isOwner = listing.ownerId === req.user.id
    const isAdmin = req.user.role === 'ADMIN'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied.' })

    const documents = await getPrisma().document.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ documents: documents.map(serializeDocument) })
  } catch (err) {
    console.error('Get listing documents error:', err)
    res.status(500).json({ error: 'Failed to load documents.' })
  }
}

// ── GET /documents — admin review queue across all listings ──
exports.adminListDocuments = async (req, res) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = String(status)

    const documents = await getPrisma().document.findMany({
      where,
      include: {
        listing: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ documents: documents.map(serializeDocument) })
  } catch (err) {
    console.error('Admin list documents error:', err)
    res.status(500).json({ error: 'Failed to load documents.' })
  }
}

// ── PATCH /documents/:id/verify — admin/staff approves a document ────────────
exports.verifyDocument = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid document ID.' })

    const existing = await getPrisma().document.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Document not found.' })

    const doc = await getPrisma().document.update({
      where: { id },
      data: { status: 'Verified', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNote: null },
    })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'DOCUMENT_VERIFIED',
      entityType: 'Document',
      entityId: id,
      entityLabel: existing.fileName || existing.type,
    })

    // Notify the uploader that their document was verified
    if (existing.userId) {
      const docLabel = existing.type.replace('_', ' ').toLowerCase()
      await createNotification(existing.userId, {
        type: 'system',
        title: 'Document verified ✅',
        body: `Your ${docLabel}${existing.fileName ? ` (${existing.fileName})` : ''} has been verified successfully.`,
        data: { documentId: id, listingId: existing.listingId, status: 'Verified' },
      })
    }

    res.json({ document: serializeDocument(doc) })
  } catch (err) {
    console.error('Verify document error:', err)
    res.status(500).json({ error: 'Failed to verify document.' })
  }
}

// ── PATCH /documents/:id/reject — admin/staff rejects, requires a note, emailed to uploader ──
exports.rejectDocument = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid document ID.' })

    const note = req.body?.note ? String(req.body.note).trim() : ''
    if (!note) return res.status(400).json({ error: 'A rejection note is required.' })

    const existing = await getPrisma().document.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, companyName: true, email: true } },
        listing: { select: { id: true, title: true } },
      },
    })
    if (!existing) return res.status(404).json({ error: 'Document not found.' })

    const doc = await getPrisma().document.update({
      where: { id },
      data: { status: 'Rejected', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNote: note },
    })

    if (existing.user?.email) {
      const docLabel = existing.type.replace('_', ' ').toLowerCase()
      await sendMail({
        to: existing.user.email,
        subject: `A document you uploaded to SweetCasa was rejected`,
        html: `
          <p>Hi ${existing.user.name || existing.user.companyName || 'there'},</p>
          <p>Your ${docLabel}${existing.listing ? ` for listing <strong>${existing.listing.title}</strong>` : ''} was reviewed and rejected for the following reason:</p>
          <blockquote style="border-left:3px solid #C98A2C;margin:12px 0;padding:8px 16px;color:#333;">${note}</blockquote>
          <p>Please upload a corrected document.</p>
          <p>— The SweetCasa Team</p>
        `,
      })
    }

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'DOCUMENT_REJECTED',
      entityType: 'Document',
      entityId: id,
      entityLabel: existing.fileName || existing.type,
      metadata: { note },
    })

    // Notify the uploader that their document was rejected
    if (existing.userId) {
      const docLabel = existing.type.replace('_', ' ').toLowerCase()
      await createNotification(existing.userId, {
        type: 'system',
        title: 'Document needs changes',
        body: `Your ${docLabel}${existing.listing ? ` for "${existing.listing.title}"` : ''} was rejected: ${note}`,
        data: { documentId: id, listingId: existing.listingId, status: 'Rejected', reviewNote: note },
      })
    }

    res.json({ document: serializeDocument(doc) })
  } catch (err) {
    console.error('Reject document error:', err)
    res.status(500).json({ error: 'Failed to reject document.' })
  }
}
