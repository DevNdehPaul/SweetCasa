const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const streamifier = require('streamifier')
const googlePlaces = require('../lib/googlePlaces')
const { sendMail } = require('../lib/email')
const { logAction } = require('../lib/audit')
const { createNotification } = require('../services/notification.service')

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

// Parses the `nearbyFacilities` JSON field sent from the listing-creation screen:
// [{ name, category, latitude?, longitude?, source: 'google' | 'manual' }, ...]
function parseNearbyFacilities(value) {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((f) => f && typeof f.name === 'string' && f.name.trim())
      .slice(0, 100) // sanity cap
      .map((f) => ({
        name: String(f.name).trim(),
        category: String(f.category || 'Other').trim(),
        latitude: Number.isFinite(Number(f.latitude)) ? Number(f.latitude) : null,
        longitude: Number.isFinite(Number(f.longitude)) ? Number(f.longitude) : null,
        source: f.source === 'google' ? 'google' : 'manual',
      }))
  } catch {
    return []
  }
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
    owner: listing.owner
      ? { ...listing.owner, phone: typeof listing.owner.phone === 'bigint' ? listing.owner.phone.toString() : listing.owner.phone }
      : listing.owner,
    videos: Array.isArray(listing.videos)
      ? listing.videos.map((video) => ({
          ...video,
          fileSize: typeof video.fileSize === 'bigint' ? video.fileSize.toString() : video.fileSize,
        }))
      : listing.videos,
  }
}

module.exports.serializeListing = serializeListing

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
      latitude, longitude, nearbyFacilities,
    } = req.body

    if (!title || !price || !type || !country || !city || !region || !description) {
      return res.status(400).json({ error: 'Please fill in the required listing fields.' })
    }

    const parsedLatitude  = parseOptionalDecimal(latitude)
    const parsedLongitude = parseOptionalDecimal(longitude)
    if (parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ error: "Please set the property's exact location on the map." })
    }

    const nearbyFacilitiesInput = parseNearbyFacilities(nearbyFacilities)
    const googleFacilities = nearbyFacilitiesInput.filter((f) => f.source === 'google')

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
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        nearbyFacilitiesCache: googleFacilities.length ? googleFacilities : undefined,
        nearbyFacilitiesFetchedAt: googleFacilities.length ? new Date() : undefined,
        floorPlanUrl: uploadedFloorPlan?.url || null,
        legalDocumentUrls: uploadedLegalDocuments,
        images: { create: uploadedPhotos },
        nearbyFacilities: nearbyFacilitiesInput.length
          ? {
              create: nearbyFacilitiesInput.map((f) => ({
                name: f.name,
                category: f.category,
                latitude: f.latitude,
                longitude: f.longitude,
                source: f.source,
              })),
            }
          : undefined,
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
      include: { images: true, videos: true, nearbyFacilities: true },
    })

    res.status(201).json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Create listing error:', err)
    res.status(500).json({ error: err.message || 'Failed to create listing.' })
  }
}

// ── GET /listings/preview-nearby?lat=&lng= — used while the owner is still
// creating the listing, before it has an id. Not persisted here. (Part 5.3) ──
exports.previewNearby = async (req, res) => {
  try {
    const lat = parseOptionalDecimal(req.query.lat)
    const lng = parseOptionalDecimal(req.query.lng)
    if (lat === null || lng === null) {
      return res.status(400).json({ error: 'lat and lng query params are required.' })
    }
    const facilities = await googlePlaces.nearbySearch(lat, lng)
    res.json({ facilities })
  } catch (err) {
    console.error('Preview nearby error:', err)
    res.status(500).json({ error: err.message || 'Failed to load nearby facilities.' })
  }
}

// ── GET /listings/places-autocomplete?input=&lat=&lng= — proxy so the Google
// API key never reaches the client (same rule the spec set for nearby search) ──
exports.placesAutocomplete = async (req, res) => {
  try {
    const input = String(req.query.input || '').trim()
    if (!input) return res.json({ predictions: [] })
    const lat = parseOptionalDecimal(req.query.lat)
    const lng = parseOptionalDecimal(req.query.lng)
    const predictions = await googlePlaces.autocomplete(input, lat, lng)
    res.json({ predictions })
  } catch (err) {
    console.error('Places autocomplete error:', err)
    res.status(500).json({ error: err.message || 'Autocomplete failed.' })
  }
}

// ── GET /listings/places-details?placeId= — resolves a prediction to lat/lng ──
exports.getPlaceDetails = async (req, res) => {
  try {
    const placeId = String(req.query.placeId || '').trim()
    if (!placeId) return res.status(400).json({ error: 'placeId is required.' })
    const place = await googlePlaces.placeDetails(placeId)
    res.json({ place })
  } catch (err) {
    console.error('Place details error:', err)
    res.status(500).json({ error: err.message || 'Failed to load place details.' })
  }
}

// ── GET /listings/:id/nearby-facilities — cached Google results (refreshed if
// older than 60 days) merged with the listing's saved NearbyFacility rows,
// i.e. Google-detected ones the owner kept + anything they added manually. (Part 5.5) ──
exports.getNearbyFacilitiesForListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findUnique({
      where: { id },
      include: { nearbyFacilities: true },
    })
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })

    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000
    const cacheAgeMs = listing.nearbyFacilitiesFetchedAt
      ? Date.now() - new Date(listing.nearbyFacilitiesFetchedAt).getTime()
      : Infinity

    let googleResults = Array.isArray(listing.nearbyFacilitiesCache) ? listing.nearbyFacilitiesCache : []

    if (listing.latitude !== null && listing.longitude !== null && cacheAgeMs > SIXTY_DAYS_MS) {
      try {
        const fresh = await googlePlaces.nearbySearch(listing.latitude, listing.longitude)
        googleResults = fresh
        await getPrisma().listing.update({
          where: { id },
          data: { nearbyFacilitiesCache: fresh, nearbyFacilitiesFetchedAt: new Date() },
        })
      } catch (err) {
        // Refresh failed (e.g. quota, network) — serve the stale cache rather than erroring out.
        console.error('[nearby-facilities] cache refresh failed, serving stale cache:', err.message)
      }
    }

    const manualAndSaved = listing.nearbyFacilities.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      latitude: f.latitude,
      longitude: f.longitude,
      source: f.source,
    }))

    res.json({
      listing: { id: listing.id, title: listing.title, latitude: listing.latitude, longitude: listing.longitude },
      facilities: [
        ...googleResults.map((g) => ({ ...g, source: 'google' })),
        ...manualAndSaved,
      ],
    })
  } catch (err) {
    console.error('Get nearby facilities error:', err)
    res.status(500).json({ error: 'Failed to load nearby facilities.' })
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

// ── APPROVE LISTING (admin/staff) ─────────────────────────────────────────────
exports.approveListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const existing = await getPrisma().listing.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Listing not found.' })

    const listing = await getPrisma().listing.update({
      where: { id },
      data: { status: 'Approved', approvedAt: new Date(), rejectionNote: null },
    })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'LISTING_APPROVED',
      entityType: 'Listing',
      entityId: id,
      entityLabel: existing.title,
    })

    // Notify the listing owner that their property was approved
    if (existing.ownerId) {
      await createNotification(existing.ownerId, {
        type: 'listing_approved',
        title: 'Listing approved 🎉',
        body: `Your listing "${existing.title}" has been approved and is now live for house seekers.`,
        data: { listingId: id, listingTitle: existing.title },
      })
    }

    res.json({ listing: serializeListing(listing) })
  } catch (err) {
    console.error('Approve listing error:', err)
    res.status(500).json({ error: 'Failed to approve listing.' })
  }
}

// ── REJECT LISTING (admin/staff) — requires a note, emailed to the owner ─────
exports.rejectListing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid listing ID.' })

    const note = req.body?.note ? String(req.body.note).trim() : ''
    if (!note) return res.status(400).json({ error: 'A rejection note is required.' })

    const existing = await getPrisma().listing.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, companyName: true, email: true } } },
    })
    if (!existing) return res.status(404).json({ error: 'Listing not found.' })

    const listing = await getPrisma().listing.update({
      where: { id },
      data: { status: 'Rejected', approvedAt: null, rejectionNote: note },
    })

    if (existing.owner?.email) {
      await sendMail({
        to: existing.owner.email,
        subject: `Your SweetCasa listing "${existing.title}" needs changes`,
        html: `
          <p>Hi ${existing.owner.name || existing.owner.companyName || 'there'},</p>
          <p>Your listing <strong>${existing.title}</strong> was reviewed and could not be approved for the following reason:</p>
          <blockquote style="border-left:3px solid #C98A2C;margin:12px 0;padding:8px 16px;color:#333;">${note}</blockquote>
          <p>You're welcome to edit the listing and resubmit it for review.</p>
          <p>— The SweetCasa Team</p>
        `,
      })
    }

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'LISTING_REJECTED',
      entityType: 'Listing',
      entityId: id,
      entityLabel: existing.title,
      metadata: { note },
    })

    // Notify the listing owner that their property was rejected
    if (existing.ownerId) {
      await createNotification(existing.ownerId, {
        type: 'listing_rejected',
        title: 'Listing needs changes',
        body: `Your listing "${existing.title}" was not approved: ${note}`,
        data: { listingId: id, listingTitle: existing.title, rejectionNote: note },
      })
    }

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
    const legalDocumentFiles = filesByField.legalDocuments || []

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

    let uploadedLegalDocuments = []
    if (legalDocumentFiles.length) {
      uploadedLegalDocuments = await Promise.all(
        legalDocumentFiles.map((file) =>
          uploadFileToCloudinary(file, 'sweetcasa/listings/legal-documents', 'raw').then((u) => u.url)
        )
      )
    }

    const updateData = {
      status: 'Pending',
      // A fresh edit means a fresh review — any earlier rejection note no longer applies.
      rejectionNote: null,
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
    if (uploadedLegalDocuments.length) updateData.legalDocumentUrls = uploadedLegalDocuments

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