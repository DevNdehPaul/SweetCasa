const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  registerPushToken,
  unregisterPushToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require('../controllers/notification.controller');

// ── Push token management ─────────────────────────────────────────────────────
router.post('/register-token', requireRole(), express.json(), registerPushToken);
router.delete('/register-token', requireRole(), express.json(), unregisterPushToken);

// ── In-app notifications ──────────────────────────────────────────────────────
router.get('/', requireRole(), getNotifications);
router.get('/unread-count', requireRole(), getUnreadCount);
router.patch('/read-all', requireRole(), markAllAsRead);
router.patch('/:id/read', requireRole(), markAsRead);
router.delete('/:id', requireRole(), deleteNotification);

module.exports = router;
