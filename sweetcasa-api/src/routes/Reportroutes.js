const express     = require('express');
const multer      = require('multer');
const { createReport, getAllReports } = require('../controllers/Reportcontroller');

const router = express.Router();

// Memory storage — buffers piped directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// ── Optional auth — attaches req.user if token present, never blocks ──────────
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      // invalid token — treat as guest
    }
  }
  next();
};

// POST /reports — submit a report (auth optional, works for guests too)
router.post('/', optionalAuth, upload.array('evidence', 3), createReport);

// GET /reports — view all reports (no auth guard for now, add requireRole later if needed)
router.get('/', getAllReports);

module.exports = router;