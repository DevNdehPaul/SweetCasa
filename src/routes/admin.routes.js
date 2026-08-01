const express = require('express')
const {
  getStats,
  getUsers,
  getUserById,
  suspendUser,
  reactivateUser,
  inviteStaff,
  listInvites,
  revokeInvite,
  getInviteInfo,
  acceptInvite,
  getAuditLogs,
} = require('../controllers/admin.controller')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// ── Shared dashboard views — admin + staff ────────────────────────────────────
router.get('/stats', requireRole('ADMIN', 'STAFF'), getStats)
router.get('/users', requireRole('ADMIN', 'STAFF'), getUsers)
router.get('/users/:id', requireRole('ADMIN', 'STAFF'), getUserById)
router.get('/audit-logs', requireRole('ADMIN', 'STAFF'), getAuditLogs)

// ── Admin-only — suspending/reactivating accounts ─────────────────────────────
router.patch('/users/:id/suspend', requireRole('ADMIN'), suspendUser)
router.patch('/users/:id/reactivate', requireRole('ADMIN'), reactivateUser)

// ── Admin-only — staff invites ─────────────────────────────────────────────────
router.post('/invites', requireRole('ADMIN'), inviteStaff)
router.get('/invites', requireRole('ADMIN'), listInvites)
router.patch('/invites/:id/revoke', requireRole('ADMIN'), revokeInvite)

// ── Public — accept-invite page uses these before the user has an account ─────
router.get('/invites/token/:token', getInviteInfo)
router.post('/invites/accept', acceptInvite)

module.exports = router
