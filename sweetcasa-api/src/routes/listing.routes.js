const express = require('express')
const {
  createListing,
  getMyListings,
  getListings,
  getListingById,
  submitListingReview,
} = require('../controllers/listing.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')

const router = express.Router()

// Public
router.get('/', getListings)
router.get('/:id', getListingById)

// Agent only
router.get('/mine', requireRole('SELLER'), getMyListings)
router.post(
  '/',
  requireRole('SELLER'),
  upload.fields([
    { name: 'photos',         maxCount: 15 },
    { name: 'video',          maxCount: 1  },
    { name: 'floorPlan',      maxCount: 1  },
    { name: 'legalDocuments', maxCount: 10 },
  ]),
  createListing
)

// Listing experience review (authenticated sellers)
router.post('/reviews', requireRole('SELLER'), submitListingReview)
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
module.exports = router