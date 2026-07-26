const express = require('express')
const { getStats, getUsers } = require('../controllers/admin.controller')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

router.get('/stats', requireRole('ADMIN'), getStats)
router.get('/users', requireRole('ADMIN'), getUsers)

module.exports = router
