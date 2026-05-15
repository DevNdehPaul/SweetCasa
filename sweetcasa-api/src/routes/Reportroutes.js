const express = require('express');
const multer  = require('multer');
const { createReport, getAllReports } = require('../controllers/Reportcontroller');
const { optionalAuth, requireAuth } = require('../middleware/requireRole'); // adjust to your auth middleware names

const router = express.Router();

// Use memory storage so buffers can be piped to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// POST /reports — submit a report (auth optional)
router.post(
  '/',
  optionalAuth,                        // attach req.user if token present, else null
  upload.array('evidence', 3),         // up to 3 evidence images
  createReport
);

// GET /reports — admin view all reports (auth required)
router.get('/', requireAuth, getAllReports);

module.exports = router;