const express = require('express')
const {
  createListing,
  getMyListings,
  getListings,
  getAdminListings,
  getAdminListingById,
  approveListing,
  rejectListing,
  getListingById,
  getListingVideo,
  deleteListing,
  editListing,
  submitListingReview,
  previewNearby,
  placesAutocomplete,
  getPlaceDetails,
  getNearbyFacilitiesForListing,
} = require('../controllers/listing.controller')
const { uploadDocument, getDocumentsForListing } = require('../controllers/document.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')
const multer = require('multer')
const documentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const router = express.Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getListings)

// ── Admin — MUST be before /:id or Express matches /admin as an id ───────────
router.get('/admin/all', requireRole('ADMIN', 'STAFF'), getAdminListings)
router.get('/admin/:id', requireRole('ADMIN', 'STAFF'), getAdminListingById)

// ── Agent only — MUST be before /:id or Express matches /mine as an id ───────
router.get('/mine', requireRole('SELLER'), getMyListings)

// ── Neighborhood map feature — any authenticated user (owner is mid-listing-
// creation here; the key never reaches the client, see lib/googlePlaces.js) ──
router.get('/preview-nearby',       requireRole(), previewNearby)
router.get('/places-autocomplete',  requireRole(), placesAutocomplete)
router.get('/places-details',       requireRole(), getPlaceDetails)

// ── Public dynamic routes — always after named routes ─────────────────────────
router.get('/:id/video', getListingVideo)
router.get('/:id/nearby-facilities', getNearbyFacilitiesForListing)
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

// ── Admin only — move a listing from Pending to Approved/Rejected ────────────
router.patch('/:id/approve', requireRole('ADMIN', 'STAFF'), approveListing)
router.patch('/:id/reject',  express.json(), requireRole('ADMIN', 'STAFF'), rejectListing)

// ── Document Vault — owner uploads, owner/admin view ─────────────────────────
router.get('/:id/documents', requireRole(), getDocumentsForListing)
router.post('/:id/documents', requireRole('SELLER'), documentUpload.single('file'), uploadDocument)

// ── Agent only — delete and edit ─────────────────────────────────────────────
router.delete('/:id', requireRole('SELLER'), deleteListing)
router.patch(
  '/:id',
  requireRole('SELLER'),
  upload.fields([
    { name: 'photos',         maxCount: 15 },
    { name: 'video',          maxCount: 1  },
    { name: 'floorPlan',      maxCount: 1  },
    { name: 'legalDocuments', maxCount: 10 },
  ]),
  editListing
)

// ── Listing experience review (authenticated sellers) ─────────────────────────
router.post('/reviews', express.json(), requireRole('SELLER'), submitListingReview)

module.exports = router