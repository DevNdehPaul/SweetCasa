const express = require('express')
const router = express.Router()
const { searchAndRankListings } = require('../lib/casaMatchEngine')

// POST /api/casa-match
router.post('/', async (req, res) => {
  try {
    const { quiz } = req.body
    if (!quiz) return res.status(400).json({ error: 'quiz payload required' })

    const match = await searchAndRankListings(quiz)
    return res.json({
      results: match.results,
      matchMode: match.matchMode,
      inventoryCount: match.inventoryCount,
      exactCount: match.exactCount || 0,
      message: match.results.length
        ? (match.matchMode === 'exact' ? 'matches_found' : 'close_matches_found')
        : 'no_available_listings',
    })
  } catch (err) {
    console.error('CasaMatch AI error:', err)
    res.status(500).json({ error: 'matching_failed', detail: err.message })
  }
})

module.exports = router
