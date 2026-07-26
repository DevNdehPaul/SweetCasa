const { getPrisma } = require('../lib/prisma');
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary');
const streamifier = require('streamifier');

// ─── Helper: upload a buffer to Cloudinary ────────────────────────────────────
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ─── POST /reports ────────────────────────────────────────────────────────────
exports.createReport = async (req, res) => {
  try {
    ensureCloudinaryConfigured();
    const prisma = getPrisma();
    const { category, subject, description, followUp } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    // Upload evidence images to Cloudinary (if any)
    const evidenceUrls = [];
    const files = req.files || [];
    for (const file of files.slice(0, 3)) {
      const url = await uploadToCloudinary(file.buffer, 'sweetcasa/reports');
      evidenceUrls.push(url);
    }

    // userId from JWT if authenticated, null for guests
    const userId = req.user?.id ?? null;

    const report = await prisma.report.create({
      data: {
        userId,
        category:     category || 'Other',
        subject:      subject.trim(),
        description:  description.trim(),
        followUp:     followUp === 'true' || followUp === true,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
        status:       'Pending',
      },
    });

    return res.status(201).json({
      message: 'Report submitted successfully.',
      reportId: report.id,
    });
  } catch (err) {
    console.error('[REPORT] createReport error:', err);
    return res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
};

// ─── GET /reports (admin only) ────────────────────────────────────────────────
exports.getAllReports = async (req, res) => {
  try {
    const prisma = getPrisma();
    const { status } = req.query;
    const where = status ? { status: String(status) } : {};
    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    return res.json({ reports });
  } catch (err) {
    console.error('[REPORT] getAllReports error:', err);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
};

// ─── PATCH /reports/:id (admin only) — Pending → Reviewed → Resolved ──────────
const ALLOWED_STATUSES = ['Pending', 'Reviewed', 'Resolved'];

exports.updateReportStatus = async (req, res) => {
  try {
    const prisma = getPrisma();
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid report ID.' });

    const status = String(req.body?.status || '');
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
    }

    const report = await prisma.report.update({ where: { id }, data: { status } });
    return res.json({ report });
  } catch (err) {
    console.error('[REPORT] updateReportStatus error:', err);
    return res.status(500).json({ error: 'Failed to update report.' });
  }
};