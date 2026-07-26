const { getPrisma } = require('../lib/prisma')

// ── GET /admin/stats — counts that power the dashboard overview cards ────────
exports.getStats = async (_req, res) => {
  try {
    const prisma = getPrisma()

    const [
      pendingListings,
      approvedListings,
      rejectedListings,
      pendingDocuments,
      pendingReports,
      totalUsers,
      totalSellers,
      totalBuyers,
    ] = await Promise.all([
      prisma.listing.count({ where: { status: 'Pending' } }),
      prisma.listing.count({ where: { status: 'Approved' } }),
      prisma.listing.count({ where: { status: 'Rejected' } }),
      prisma.document.count({ where: { status: 'Pending' } }),
      prisma.report.count({ where: { status: 'Pending' } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'BUYER' } }),
    ])

    res.json({
      listings: { pending: pendingListings, approved: approvedListings, rejected: rejectedListings },
      documents: { pending: pendingDocuments },
      reports: { pending: pendingReports },
      users: { total: totalUsers, sellers: totalSellers, buyers: totalBuyers },
    })
  } catch (err) {
    console.error('Get admin stats error:', err)
    res.status(500).json({ error: 'Failed to load dashboard stats.' })
  }
}

// ── GET /admin/users — directory of all users, with basic verification info ──
exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = '1', limit = '25' } = req.query

    const where = {}
    if (role) where.role = String(role)
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { companyName: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10)))

    const [users, total] = await Promise.all([
      getPrisma().user.findMany({
        where,
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          role: true,
          country: true,
          region: true,
          city: true,
          nationalIdUrl: true,
          createdAt: true,
          _count: { select: { listings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().user.count({ where }),
    ])

    res.json({
      users: users.map((u) => ({
        ...u,
        phone: u.phone !== null ? u.phone.toString() : null,
        idVerified: Boolean(u.nationalIdUrl),
        listingCount: u._count?.listings ?? 0,
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Get admin users error:', err)
    res.status(500).json({ error: 'Failed to load users.' })
  }
}
