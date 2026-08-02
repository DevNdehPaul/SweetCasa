const express = require('express')
const {
  getSavedListings,
  saveListing,
  unsaveListing,
} = require('../controllers/favourite.controller')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// All favourites routes require an authenticated user (any role).
router.use(requireRole())

router.get('/', getSavedListings)
router.post('/:listingId', saveListing)
router.delete('/:listingId', unsaveListing)

module.exports = router

