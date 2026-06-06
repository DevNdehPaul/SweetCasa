const express = require('express')
const router  = express.Router()

const {
  getConversations,
  getMessages,
  startConversation,
  sendMessage,
  markAsRead,
} = require('../controllers/message.controller')

const requireRole = require('../middleware/requireRole')

// All messaging endpoints require a valid JWT (any role)
router.use(requireRole())

// ── Conversations ──────────────────────────────────────────────────────────────
// GET  /messages/conversations            — list all conversations for current user
// POST /messages/conversations            — start or retrieve a conversation
router.get('/',  getConversations)
router.post('/', express.json(), startConversation)

// ── Messages inside a conversation ────────────────────────────────────────────
// GET   /messages/conversations/:id               — fetch messages (+ marks as seen)
// POST  /messages/conversations/:id/messages      — send a message
// PATCH /messages/conversations/:id/read          — mark received messages as seen
router.get('/:id',           getMessages)
router.post('/:id/messages', express.json(), sendMessage)
router.patch('/:id/read',    markAsRead)

module.exports = router
