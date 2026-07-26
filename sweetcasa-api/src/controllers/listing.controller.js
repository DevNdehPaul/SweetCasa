const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const streamifier = require('streamifier')

function parseNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseOptionalDecimal(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeString(value) {
  const normalized = String(value || '').trim()
  return normalized || null
}

function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => String(item || '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

function serializeListing(listing) {
  return {
    ...listing,
    price:   listing.price?.toString?.()   ?? listing.price,
    areaSqm: listing.areaSqm?.toString?.() ?? listing.areaSqm,
    agent:   listing.agent ?? null,
    videos: Array.isArray(listing.videos)
      ? listing.videos.map((video) => ({
          ...video,
          fileSize: typeof video.fileSize === 'bigint' ? video.fileSize.toString() : video.fileSize,
        }))
      : listing.videos,
  }
}

// ─── Upload helper ────────────────────────────────────────────────────────────
// Uses streamifier for raw files (PDF, DOCX) so the buffer is piped correctly.
// Images and videos use stream.end(buffer) as before.
async function uploadFileToCloudinary(file, folder, resourceType = 'image') {
  const uploaded = await new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      timeout: resourceType === 'video' ? 300000 : 180000,
      // Preserve original filename + extension so Cloudinary stores & serves
      // the file with the correct extension (e.g. .pdf, .docx)
      use_filename: true,
      unique_filename: true,
      // Explicitly tell Cloudinary the format for raw files
      ...(resourceType === 'raw' && {
        format: file.originalname?.split('.').pop()?.toLowerCase() || undefined,
      }),
    }

    // ── Raw files (PDF, DOCX, etc.) — pipe via streamifier ──
    if (resourceType === 'raw') {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
      streamifier.createReadStream(file.buffer).pipe(stream)
      return
    }

    // ── Video — chunked upload ──
    if (resourceType === 'video') {
      const stream = cloudinary.uploader.upload_chunked_stream(
        { ...options, chunk_size: 6 * 1024 * 1024 },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      stream.end(file.buffer)
      return
    }

    // ── Image — standard upload ──
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
    stream.end(file.buffer)
  })

  return {
    url: uploaded.secure_url,   // now includes extension for raw files
    publicId: uploaded.public_id,
    bytes: uploaded.bytes,
    duration: uploaded.duration ? Math.round(uploaded.duration) : null,
    thumbnailUrl: uploaded.thumbnail_url || null,
  }
}

function groupFilesByField(files) {
  if (!files) return {}
  if (Array.isArray(files)) {
    return files.reduce((acc, file) => {
      acc[file.fieldname] = acc[file.fieldname] || []
      acc[file.fieldname].push(file)
      return acc
    }, {})
  }
  return files
}

// ── CREATE LISTING ────────────────────────────────────────────────────────────
exports.createListing = async (req, res) => {
  try {
    ensureCloudinaryConfigured()
    console.log('LISTING BODY:', JSON.stringify(req.body))
    console.log(
      'LISTING FILES:',
      req.files
        ? Array.isArray(req.files)
          ? `${req.files.length} files (array)`
          : `fields: ${Object.keys(req.files).join(', ')}`
        : 'none'
    )

    const {
      title, price, type, country, city, region,
      neighborhood, description, bedrooms, bathrooms, toilets,
      parlors, kitchens, areaSqm, paymentFrequency,
      visitHours, facilities,
      nearbySchoolName, nearbyBankName, nearbyRestaurantName,
      nearbyMarketName, nearbyClinicName,
    } = req.body

    if (!title || !price || !type || !country || !city || !region || !description) {
      return res.status(400).json({ error: 'Please fill in the required listing fields.' })
    }

    const filesByField = groupFilesByField(req.files || [])
    const photoFiles = filesByField.photos || []
    const videoFile = filesByField.video?.[0] || null
    const floorPlanFile = filesByField.floorPlan?.[0] || null
    const legalDocumentFiles = filesByField.legalDocuments || []

    if (!photoFiles.length) {
      return res.status(400).json({ error: 'Please upload at least one property photo.' })
    }

    const uploadedPhotos = await Promise.all(
      photoFiles.map((file, index) =>
        uploadFileToCloudinary(file, 'sweetcasa/listings/photos').then((uploaded) => ({
          imageUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          isPrimary: index === 0,
          sortOrder: index,
        }))
      )
    )

    const uploadedVideo = videoFile
      ? await uploadFileToCloudinary(videoFile, 'sweetcasa/listings/videos', 'video')
      : null

    const uploadedFloorPlan = floorPlanFile
      ? await uploadFileToCloudinary(floorPlanFile, 'sweetcasa/listings/floor-plans', 'raw')
      : null

    const uploadedLegalDocuments = await Promise.all(
      legalDocumentFiles.map((file) =>
        uploadFileToCloudinary(file, 'sweetcasa/listings/legal-documents', 'raw').then((u) => u.url)
      )
    )

    const listing = await getPrisma().listing.create({
      data: {
        owner: { connect: { id: req.user.id } },
        title: String(title).trim(),
        price: Number.parseFloat(String(price)),
        type: String(type).trim(),
        status: 'Pending',
        country: String(country).trim(),
        city: String(city).trim(),
        region: String(region).trim(),
        neighborhood: normalizeString(neighborhood),
        description: String(description).trim(),
        bedrooms: parseNumber(bedrooms),
        bathrooms: parseNumber(bathrooms),
        toilets: parseNumber(toilets),
        parlors: parseNumber(parlors),
        kitchens: parseNumber(kitchens),
        areaSqm: parseOptionalDecimal(areaSqm),
        paymentFrequency: normalizeString(paymentFrequency),
        visitHours: normalizeString(visitHours),
        facilities: parseJsonArray(facilities),
        nearbySchoolName: normalizeString(nearbySchoolName),
        nearbyBankName: normalizeString(nearbyBankName),
        nearbyRestaurantName: normalizeString(nearbyRestaurantName),
        nearbyMarketName: normalizeString(nearbyMarketName),
        nearbyClinicName: normalizeString(nearbyClinicName),
        floorPlanUrl: uploadedFloorPlan?.url || null,
        legalDocumentUrls: uploadedLegalDocuments,
        images: { create: uploadedPhotos },
        videos: uploadedVideo
          ? {
              create: {
                videoUrl: uploadedVideo.url,
                thumbnailUrl: uploadedVideo.thumbnailUrl,
                cloudinaryPublicId: uploadedVideo.publicId,
                durationSecond: uploadedVideo.duration,
                fileSize: uploadedVideo.bytes ? BigInt(uploadedVideo.bytes) : null,
              },
            }
          : undefined,
      },
      include: { images: true, videos: true },
    })

    res.status(201).json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Create listing error:', err)
    res.status(500).json({ error: err.message || 'Failed to create listing.' })
  }
}

// ── GET MY LISTINGS (seller) ──────────────────────────────────────────────────
exports.getMyListings = async (req, res) => {
  try {
    const listings = await getPrisma().listing.findMany({
      where: { ownerId: req.user.id },
      include: { images: true, videos: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ listings: listings.map(serializeListing) })
  } catch (err) {
    console.error('Fetch listings error:', err)
    res.status(500).json({ error: 'Failed to load listings.' })
  }
}

// ── GET PUBLIC LISTINGS (search) ──────────────────────────────────────────────
exports.getListings = async (req, res) => {
  try {
    const {
      region, city, neighborhood,
      type, state,
      maxBudget, minBudget,
      facilities,
      paymentFrequency,
      page = '1',
      limit = '20',
    } = req.query

    const where = { status: 'Approved' }

    if (region)           where.region           = { equals: region,         mode: 'insensitive' }
    if (city)             where.city             = { equals: city,           mode: 'insensitive' }
    if (neighborhood)     where.neighborhood     = { contains: neighborhood, mode: 'insensitive' }
    if (type)             where.type             = { equals: type,           mode: 'insensitive' }
    if (state)            where.state            = { equals: state,          mode: 'insensitive' }
    if (paymentFrequency) where.paymentFrequency = { equals: paymentFrequency, mode: 'insensitive' }

    if (minBudget || maxBudget) {
      where.price = {}
      if (minBudget) where.price.gte = Number.parseFloat(minBudget)
      if (maxBudget) where.price.lte = Number.parseFloat(maxBudget)
    }

    if (facilities) {
      const list = facilities.split(',').map((f) => f.trim()).filter(Boolean)
      if (list.length) {
        where.AND = list.map((f) => ({ facilities: { array_contains: f } }))
      }
    }

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10)))

    const [listings, total] = await Promise.all([
      getPrisma().listing.findMany({
        where,
        include: { images: true, videos: true },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().listing.count({ where }),
    ])

    res.json({
      listings: listings.map(serializeListing),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Get listings error:', err)
    res.status(500).json({ error: 'Failed to load listings.' })
  }
}

// ── GET LISTINGS FOR ADMIN (any status, includes owner + document counts) ────
exports.getAdminListings = async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query

    const where = {}
    if (status) where.status = String(status)

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10)))

    const [listings, total] = await Promise.all([
      getPrisma().listing.findMany({
        where,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          owner: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().listing.count({ where }),
    ])

    res.json({
      listings: listings.map((l) => ({ ...serializeListing(l), documentCount: l._count?.documents ?? 0 })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Get admin listings error:', err)
    res.status(500).json({ error: 'Failed to load listings.' })
  }
}

// ── GET SINGLE LISTING FOR ADMIN (any status, full detail incl. documents) ───
exports.getAdminListingById = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findUnique({
      where: { id },
      include: {
        images: true,
        videos: true,
        documents: true,
        owner: {
          select: { id: true, name: true, companyName: true, email: true, phone: true, nationalIdUrl: true, createdAt: true },
        },
      },
    })

    if (!listing) return res.status(404).json({ error: 'Listing not found.' })

    res.json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Get admin listing by id error:', err)
    res.status(500).json({ error: 'Failed to load listing.' })
  }
}

// ── APPROVE LISTING (admin) ───────────────────────────────────────────────────
exports.approveListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const existing = await getPrisma().listing.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Listing not found.' })

    const listing = await getPrisma().listing.update({
      where: { id },
      data: { status: 'Approved', approvedAt: new Date() },
    })

    res.json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Approve listing error:', err)
    res.status(500).json({ error: 'Failed to approve listing.' })
  }
}

// ── REJECT LISTING (admin) ────────────────────────────────────────────────────
exports.rejectListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const existing = await getPrisma().listing.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Listing not found.' })

    const listing = await getPrisma().listing.update({
      where: { id },
      data: { status: 'Rejected', approvedAt: null },
    })

    res.json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Reject listing error:', err)
    res.status(500).json({ error: 'Failed to reject listing.' })
  }
}

// ── GET LISTING BY ID ─────────────────────────────────────────────────────────
exports.getListingById = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findFirst({
      where: { id, status: 'Approved' },
      include: {
        images: true,
        videos: true,
      },
    })

    if (!listing) return res.status(404).json({ error: 'Listing not found.' })

    let agent = null
    if (listing.ownerId) {
      const user = await getPrisma().user.findUnique({
        where: { id: listing.ownerId },
        select: {
          id:          true,
          name:        true,
          companyName: true,
          phone:       true,
          city:        true,
          country:     true,
          region:      true,
          street:      true,
        },
      })
      if (user) {
        agent = {
          id:          user.id,
          name:        user.name ?? user.companyName ?? 'Property Agent',
          avatarUrl:   null,
          rating:      0,
          reviewCount: 0,
          city:        user.city    ?? null,
          country:     user.country ?? null,
          region:      user.region  ?? null,
          street:      user.street  ?? null,
        }
      }
    }

    res.json({ listing: serializeListing({ ...listing, agent }) })
  } catch (err) {
    console.error('Get listing by id error:', err)
    res.status(500).json({ error: 'Failed to load listing.' })
  }
}

// ── GET LISTING VIDEO ─────────────────────────────────────────────────────────
exports.getListingVideo = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const video = await getPrisma().listingVideo.findFirst({
      where: { listingId: id },
      select: { videoUrl: true, thumbnailUrl: true },
    })

    if (!video || !video.videoUrl) {
      return res.status(404).json({ error: 'No video found for this listing.' })
    }

    res.json({
      video_url: video.videoUrl,
      thumbnail_url: video.thumbnailUrl ?? null,
    })
  } catch (err) {
    console.error('Get listing video error:', err)
    res.status(500).json({ error: 'Failed to load video.' })
  }
}

// ── SUBMIT LISTING REVIEW ─────────────────────────────────────────────────────
exports.submitListingReview = async (req, res) => {
  try {
    const { review } = req.body
    if (!review || !String(review).trim()) {
      return res.status(400).json({ error: 'Review text is required.' })
    }

    const saved = await getPrisma().listingReview.create({
      data: {
        userId: req.user.id,
        userRole: req.user.role || 'SELLER',
        review: String(review).trim(),
      },
    })

    res.status(201).json({ success: true, review: saved })
  } catch (err) {
    console.error('Submit listing review error:', err)
    res.status(500).json({ error: 'Failed to save review.' })
  }
}

// ── DELETE LISTING ────────────────────────────────────────────────────────────
exports.deleteListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findFirst({
      where: { id, ownerId: req.user.id },
    })
    if (!listing) return res.status(404).json({ error: 'Listing not found or access denied.' })

    await getPrisma().listingVideo.deleteMany({ where: { listingId: id } })
    await getPrisma().listingImage.deleteMany({ where: { listingId: id } })
    await getPrisma().listing.delete({ where: { id } })

    res.json({ success: true, message: 'Listing deleted successfully.' })
  } catch (err) {
    console.error('Delete listing error:', err)
    res.status(500).json({ error: 'Failed to delete listing.' })
  }
}

// ── EDIT LISTING ──────────────────────────────────────────────────────────────
exports.editListing = async (req, res) => {
  try {
    ensureCloudinaryConfigured()
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const existing = await getPrisma().listing.findFirst({
      where: { id, ownerId: req.user.id },
      include: { images: true, videos: true },
    })
    if (!existing) return res.status(404).json({ error: 'Listing not found or access denied.' })

    const {
      title, price, type, city, region, neighborhood,
      description, bedrooms, bathrooms, toilets,
      parlors, kitchens, areaSqm, paymentFrequency,
      visitHours, facilities,
      nearbySchoolName, nearbyBankName, nearbyRestaurantName,
      nearbyMarketName, nearbyClinicName,
    } = req.body

    const filesByField = groupFilesByField(req.files || [])
    const photoFiles = filesByField.photos || []
    const videoFile = filesByField.video?.[0] || null
    const floorPlanFile = filesByField.floorPlan?.[0] || null

    let newImages = []
    if (photoFiles.length) {
      newImages = await Promise.all(
        photoFiles.map((file, index) =>
          uploadFileToCloudinary(file, 'sweetcasa/listings/photos').then((uploaded) => ({
            imageUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId,
            isPrimary: index === 0,
            sortOrder: index,
          }))
        )
      )
    }

    let uploadedVideo = null
    if (videoFile) {
      uploadedVideo = await uploadFileToCloudinary(videoFile, 'sweetcasa/listings/videos', 'video')
    }

    let uploadedFloorPlan = null
    if (floorPlanFile) {
      uploadedFloorPlan = await uploadFileToCloudinary(floorPlanFile, 'sweetcasa/listings/floor-plans', 'raw')
    }

    const updateData = {
      status: 'Pending',
    }
    if (title)            updateData.title            = String(title).trim()
    if (price)            updateData.price            = Number.parseFloat(String(price))
    if (type)             updateData.type             = String(type).trim()
    if (city)             updateData.city             = String(city).trim()
    if (region)           updateData.region           = String(region).trim()
    if (neighborhood !== undefined) updateData.neighborhood = normalizeString(neighborhood)
    if (description)      updateData.description      = String(description).trim()
    if (bedrooms !== undefined)   updateData.bedrooms   = parseNumber(bedrooms)
    if (bathrooms !== undefined)  updateData.bathrooms  = parseNumber(bathrooms)
    if (toilets !== undefined)    updateData.toilets    = parseNumber(toilets)
    if (parlors !== undefined)    updateData.parlors    = parseNumber(parlors)
    if (kitchens !== undefined)    updateData.kitchens   = parseNumber(kitchens)
    if (areaSqm !== undefined)    updateData.areaSqm    = parseOptionalDecimal(areaSqm)
    if (paymentFrequency !== undefined) updateData.paymentFrequency = normalizeString(paymentFrequency)
    if (visitHours !== undefined) updateData.visitHours = normalizeString(visitHours)
    if (facilities)       updateData.facilities       = parseJsonArray(facilities)
    if (nearbySchoolName !== undefined)     updateData.nearbySchoolName     = normalizeString(nearbySchoolName)
    if (nearbyBankName !== undefined)       updateData.nearbyBankName       = normalizeString(nearbyBankName)
    if (nearbyRestaurantName !== undefined) updateData.nearbyRestaurantName = normalizeString(nearbyRestaurantName)
    if (nearbyMarketName !== undefined)     updateData.nearbyMarketName     = normalizeString(nearbyMarketName)
    if (nearbyClinicName !== undefined)     updateData.nearbyClinicName     = normalizeString(nearbyClinicName)
    if (uploadedFloorPlan) updateData.floorPlanUrl = uploadedFloorPlan.url

    await getPrisma().listing.update({ where: { id }, data: updateData })

    if (newImages.length) {
      await getPrisma().listingImage.deleteMany({ where: { listingId: id } })
      await getPrisma().listingImage.createMany({
        data: newImages.map((img) => ({ ...img, listingId: id })),
      })
    }

    if (uploadedVideo) {
      await getPrisma().listingVideo.deleteMany({ where: { listingId: id } })
      await getPrisma().listingVideo.create({
        data: {
          listingId:           id,
          videoUrl:            uploadedVideo.url,
          thumbnailUrl:        uploadedVideo.thumbnailUrl,
          cloudinaryPublicId:  uploadedVideo.publicId,
          durationSecond:      uploadedVideo.duration,
          fileSize:            uploadedVideo.bytes ? BigInt(uploadedVideo.bytes) : null,
        },
      })
    }

    const final = await getPrisma().listing.findFirst({
      where: { id },
      include: { images: true, videos: true },
    })

    res.json({ listing: serializeListing(final) })
  } catch (err) {
    console.error('Edit listing error:', err)
    res.status(500).json({ error: err.message || 'Failed to update listing.' })
  }
}