const express = require('express')
const multer = require('multer')
const router = express.Router()

const { register, login, logout, updateProfile, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/auth.controller')
const requireRole = require('../middleware/requireRole')

// ─── Multer – memory storage (buffer handed to Cloudinary stream) ─────────────
// Accepts images (jpg/png/webp) and PDFs only; hard cap at 5 MB per file.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPG, PNG, WEBP images and PDF documents are accepted for the National ID.'))
    }
  },
})

// ─── Multer error handler (formats multer errors as JSON) ─────────────────────
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'National ID file exceeds the 5 MB size limit.' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /auth/register — multipart/form-data; "nationalId" is the file field name
router.post(
  '/register',
  upload.single('nationalId'),
  handleMulterError,
  register,
)

router.post('/login', login)

// ── Password reset (public, no auth required) ─────────────────────────────────
router.post('/forgot-password', express.json(), forgotPassword)
router.post('/verify-reset-code', express.json(), verifyResetCode)
router.post('/reset-password', express.json(), resetPassword)

// PUT /auth/profile — optionally accepts a "nationalId" file to replace the stored one
router.put(
  '/profile',
  requireRole(),
  upload.fields([
    { name: 'nationalId', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
  ]),
  handleMulterError,
  updateProfile,
)

router.post('/logout', requireRole(), logout)

// Lightweight endpoint for clients to verify their session is still valid —
// requireRole() already checks live account status, so reaching this handler
// means the token is good and the account isn't suspended.
router.get('/session', requireRole(), (req, res) => res.json({ ok: true, role: req.user.role }))

// ─── Role-scoped test routes ───────────────────────────────────────────────────
router.get('/buyer-only', requireRole('BUYER'), (_req, res) => res.json({ ok: true, role: 'BUYER' }))
router.get('/seller-only', requireRole('SELLER'), (_req, res) => res.json({ ok: true, role: 'SELLER' }))
router.get('/admin-only', requireRole('ADMIN'), (_req, res) => res.json({ ok: true, role: 'ADMIN' }))

module.exports = router
