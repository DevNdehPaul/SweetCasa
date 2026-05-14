const express = require('express')
const router = express.Router()
const { register, login, logout } = require('../controllers/auth.controller')
const requireRole = require('../middleware/requireRole')
const { updateProfile } = require('../controllers/auth.controller')

router.post('/register', register)
router.post('/login',    login)
router.put('/profile', requireRole(), updateProfile)
router.post('/logout',   requireRole(), logout)

// Test routes for each role
router.get('/buyer-only',  requireRole('BUYER'),          (req, res) => res.json({ ok: true, role: 'BUYER' }))
router.get('/seller-only', requireRole('SELLER'),         (req, res) => res.json({ ok: true, role: 'SELLER' }))
router.get('/admin-only',  requireRole('ADMIN'),          (req, res) => res.json({ ok: true, role: 'ADMIN' }))

module.exports = router