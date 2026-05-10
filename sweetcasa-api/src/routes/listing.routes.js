const express = require('express')
const {
  createListing,
  getMyListings,
  getListings,
  getListingById,
} = require('../controllers/listing.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')

const router = express.Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getListings)

// ── Seller only — must be BEFORE /:id or Express catches 'mine' as an ID ─────
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

// ── Public — keep /:id LAST so it doesn't swallow named routes ────────────────
router.get('/:id', getListingById)

module.exports = router