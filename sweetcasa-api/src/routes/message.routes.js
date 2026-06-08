const express = require('express')
const router  = express.Router()

const {
  getConversations,
  getMessages,
  startConversation,
  sendMessage,
  markAsRead,
  deleteConversation,
  getStats,
} = require('../controllers/message.controller')

const requireRole = require('../middleware/requireRole')

router.use(requireRole())

// stats must come before /:id so it isn't swallowed by the param route
router.get('/stats', getStats)

router.get('/',  getConversations)
router.post('/', express.json(), startConversation)

router.get('/:id',           getMessages)
router.post('/:id/messages', express.json(), sendMessage)
router.patch('/:id/read',    markAsRead)
router.delete('/:id',        deleteConversation)

module.exports = router
