const express = require('express')
const { adminListDocuments, verifyDocument, rejectDocument } = require('../controllers/document.controller')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// GET /documents?status=Pending — admin review queue across all listings
router.get('/', requireRole('ADMIN', 'STAFF'), adminListDocuments)

// PATCH /documents/:id/verify — admin approves a document
router.patch('/:id/verify', requireRole('ADMIN', 'STAFF'), verifyDocument)

// PATCH /documents/:id/reject — admin rejects a document
router.patch('/:id/reject', requireRole('ADMIN', 'STAFF'), rejectDocument)

module.exports = router
