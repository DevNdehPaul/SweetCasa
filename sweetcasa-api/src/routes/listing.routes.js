const express = require('express')
const {
  createListing,
  getMyListings,
  getListings,
  getListingById,
  getListingVideo,
  submitListingReview,
} = require('../controllers/listing.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')

const router = express.Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getListings)
router.get('/:id/video', getListingVideo)   // MUST be before /:id
router.get('/:id', getListingById)

// ── Agent only ────────────────────────────────────────────────────────────────
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

// ── Listing experience review (authenticated sellers) ─────────────────────────
router.post('/reviews', requireRole('SELLER'), submitListingReview)

module.exports = router