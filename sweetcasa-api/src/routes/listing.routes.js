const express = require('express')
const {
  createListing,
  getMyListings,
  getListings,
  getListingById,
  getListingVideo,
  deleteListing,
  editListing,
  submitListingReview,
} = require('../controllers/listing.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')

const router = express.Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getListings)

// ── Agent only — MUST be before /:id or Express matches /mine as an id ───────
router.get('/mine', requireRole('SELLER'), getMyListings)

// ── Public dynamic routes — always after named routes ─────────────────────────
router.get('/:id/video', getListingVideo)
router.get('/:id', getListingById)
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

// ── Agent only — delete and edit ─────────────────────────────────────────────
router.delete('/:id', requireRole('SELLER'), deleteListing)
router.patch(
  '/:id',
  requireRole('SELLER'),
  upload.fields([
    { name: 'photos',    maxCount: 15 },
    { name: 'video',     maxCount: 1  },
    { name: 'floorPlan', maxCount: 1  },
  ]),
  editListing
)

// ── Listing experience review (authenticated sellers) ─────────────────────────
router.post('/reviews', requireRole('SELLER'), submitListingReview)

module.exports = router