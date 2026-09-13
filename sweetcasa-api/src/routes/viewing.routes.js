const express = require('express')
const requireRole = require('../middleware/requireRole')
const {
  createViewingRequest,
  getMyViewingRequests,
  getReceivedViewingRequests,
  getViewingRequest,
  confirmViewingRequest,
  declineViewingRequest,
  cancelViewingRequest,
} = require('../controllers/viewing.controller')

const router = express.Router()
router.use(requireRole())
router.post('/', express.json(), createViewingRequest)
router.get('/mine', getMyViewingRequests)
router.get('/received', getReceivedViewingRequests)
router.get('/:id', getViewingRequest)
router.patch('/:id/confirm', express.json(), confirmViewingRequest)
router.patch('/:id/decline', express.json(), declineViewingRequest)
router.patch('/:id/cancel', express.json(), cancelViewingRequest)
module.exports = router
