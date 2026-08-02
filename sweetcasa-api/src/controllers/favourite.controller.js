const { getPrisma } = require('../lib/prisma')
const { serializeListing } = require('./listing.controller')

// ── GET /favourites — all listings saved by the current user ────────────────
exports.getSavedListings = async (req, res) => {
  try {
    const saved = await getPrisma().savedListing.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: { images: true, videos: true },
        },
      },
      orderBy: { savedAt: 'desc' },
    })

    // Only return listings that are still approved/live.
    const listings = saved
      .filter((s) => s.listing && s.listing.status === 'Approved')
      .map((s) => ({
        savedAt: s.savedAt,
        listing: serializeListing(s.listing),
      }))

    res.json({ savedListings: listings, count: listings.length })
  } catch (err) {
    console.error('Get saved listings error:', err)
    res.status(500).json({ error: 'Failed to load saved listings.' })
  }
}

// ── POST /favourites/:listingId — save (add) a listing to favourites ────────
exports.saveListing = async (req, res) => {
  try {
    const listingId = Number.parseInt(req.params.listingId, 10)
    if (!listingId) return res.status(400).json({ error: 'Invalid listing ID.' })

    const listing = await getPrisma().listing.findFirst({
      where: { id: listingId, status: 'Approved' },
    })
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })

    // Upsert: adding a listing that is already saved is a no-op.
    const saved = await getPrisma().savedListing.upsert({
      where: {
        userId_listingId: { userId: req.user.id, listingId },
      },
      create: {
        userId: req.user.id,
        listingId,
      },
      update: {},
      include: { listing: { include: { images: true, videos: true } } },
    })

    res.status(201).json({
      saved: true,
      savedListing: {
        savedAt: saved.savedAt,
        listing: serializeListing(saved.listing),
      },
    })
  } catch (err) {
    console.error('Save listing error:', err)
    res.status(500).json({ error: 'Failed to save listing.' })
  }
}

// ── DELETE /favourites/:listingId — remove a listing from favourites ────────
exports.unsaveListing = async (req, res) => {
  try {
    const listingId = Number.parseInt(req.params.listingId, 10)
    if (!listingId) return res.status(400).json({ error: 'Invalid listing ID.' })

    await getPrisma().savedListing.deleteMany({
      where: { userId: req.user.id, listingId },
    })

    res.json({ saved: false })
  } catch (err) {
    console.error('Unsave listing error:', err)
    res.status(500).json({ error: 'Failed to remove listing from favourites.' })
  }
}

