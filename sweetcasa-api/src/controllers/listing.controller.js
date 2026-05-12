const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')

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
    price: listing.price?.toString?.() ?? listing.price,
    areaSqm: listing.areaSqm?.toString?.() ?? listing.areaSqm,
    videos: Array.isArray(listing.videos)
      ? listing.videos.map((video) => ({
          ...video,
          fileSize: typeof video.fileSize === 'bigint' ? video.fileSize.toString() : video.fileSize,
        }))
      : listing.videos,
  }
}

async function uploadFileToCloudinary(file, folder, resourceType = 'image') {
  const uploaded = await new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      timeout: resourceType === 'video' ? 300000 : 180000,
    }

    const stream =
      resourceType === 'video'
        ? cloudinary.uploader.upload_chunked_stream(
            { ...options, chunk_size: 6 * 1024 * 1024 },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          )
        : cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) reject(error)
            else resolve(result)
          })

    stream.end(file.buffer)
  })

  return {
    url: uploaded.secure_url,
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
      parlors, verandas, areaSqm, paymentFrequency,
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
        verandas: parseNumber(verandas),
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
        owner: {
          select: { id: true, name: true, companyName: true, phone: true },
        },
      },
    })

    if (!listing) return res.status(404).json({ error: 'Listing not found.' })
    res.json({ listing: serializeListing(listing) })
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