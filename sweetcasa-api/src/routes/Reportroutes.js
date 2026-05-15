const express      = require('express');
const multer       = require('multer');
const requireRole  = require('../middleware/auth'); // matches your existing middleware
const { createReport, getAllReports } = require('../controllers/Reportcontroller');

const router = express.Router();

// Memory storage so buffers can be piped to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// ── Optional auth helper ──────────────────────────────────────────────────────
// Attaches req.user if a valid Bearer token is present, but never blocks
// the request — reports can be submitted by guests too.
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      // invalid token — just ignore, treat as guest
    }
  }
  next();
};

// POST /reports — submit a report (auth optional)
router.post('/', optionalAuth, upload.array('evidence', 3), createReport);

// GET /reports — admin only
router.get('/', requireRole('ADMIN'), getAllReports);

module.exports = router;