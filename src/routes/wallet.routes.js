const express = require('express')
const {
  getMyWallet,
  listMyTransactions,
  deposit,
  verifyDeposit,
  fapshiWebhook,
  releaseHold,
  refundHold,
  withdraw,
} = require('../controllers/wallet.controller')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// ── Public — Fapshi calls this directly, guarded by x-wh-secret instead of a JWT ──
router.post('/webhooks/fapshi', fapshiWebhook)

// ── Any authenticated user ────────────────────────────────────────────────────
router.get('/me', requireRole(), getMyWallet)
router.get('/transactions', requireRole(), listMyTransactions)
router.post('/deposit', requireRole(), deposit)
router.get('/deposit/:id/verify', requireRole(), verifyDeposit)
router.post('/withdraw', requireRole('SELLER'), withdraw)

// ── Admin/staff — the "admin-triggered release" from the roadmap ─────────────
router.patch('/transactions/:id/release', requireRole('ADMIN', 'STAFF'), releaseHold)
router.post('/transactions/:id/refund',   requireRole('ADMIN', 'STAFF'), refundHold)

module.exports = router
