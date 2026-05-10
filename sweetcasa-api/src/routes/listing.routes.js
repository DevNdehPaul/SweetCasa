const express = require('express')
const { createListing, getMyListings, getListings, getListingById } = require('../controllers/listing.controller')
const requireRole = require('../middleware/requireRole')
const upload = require('../middleware/upload')

const router = express.Router()

// Public
router.get('/',     getListings)
router.get('/:id',  getListingById)
router.get('/listings/:id/video', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('listing_videos')
      .select('video_url, thumbnail_url, cloudinary_public_id')
      .eq('listing_id', id)
      .single();

    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
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

module.exports = router