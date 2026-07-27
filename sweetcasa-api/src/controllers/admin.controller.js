const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { getPrisma } = require('../lib/prisma')
const { sendMail } = require('../lib/email')
const { logAction } = require('../lib/audit')

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function serializeUser(u) {
  return {
    id: u.id,
    name: u.name,
    companyName: u.companyName,
    email: u.email,
    phone: u.phone !== null && u.phone !== undefined ? u.phone.toString() : null,
    role: u.role,
    status: u.status,
    suspendedAt: u.suspendedAt,
    suspensionReason: u.suspensionReason,
    country: u.country,
    region: u.region,
    city: u.city,
    nationalIdUrl: u.nationalIdUrl,
    idVerified: Boolean(u.nationalIdUrl),
    listingCount: u._count?.listings ?? undefined,
    createdAt: u.createdAt,
  }
}

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
      suspendedUsers,
      pendingInvites,
    ] = await Promise.all([
      prisma.listing.count({ where: { status: 'Pending' } }),
      prisma.listing.count({ where: { status: 'Approved' } }),
      prisma.listing.count({ where: { status: 'Rejected' } }),
      prisma.document.count({ where: { status: 'Pending' } }),
      prisma.report.count({ where: { status: 'Pending' } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'BUYER' } }),
      prisma.user.count({ where: { status: 'Suspended' } }),
      prisma.staffInvite.count({ where: { status: 'Pending' } }),
    ])

    res.json({
      listings: { pending: pendingListings, approved: approvedListings, rejected: rejectedListings },
      documents: { pending: pendingDocuments },
      reports: { pending: pendingReports },
      users: { total: totalUsers, sellers: totalSellers, buyers: totalBuyers, suspended: suspendedUsers },
      invites: { pending: pendingInvites },
    })
  } catch (err) {
    console.error('Get admin stats error:', err)
    res.status(500).json({ error: 'Failed to load dashboard stats.' })
  }
}

// ── GET /admin/users — directory of all users, with verification + status ────
exports.getUsers = async (req, res) => {
  try {
    const { role, search, status, page = '1', limit = '25' } = req.query

    const where = {}
    if (role) where.role = String(role)
    if (status) where.status = String(status)
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
          status: true,
          suspendedAt: true,
          suspensionReason: true,
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
      users: users.map(serializeUser),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Get admin users error:', err)
    res.status(500).json({ error: 'Failed to load users.' })
  }
}

// ── GET /admin/users/:id — full profile + their listings, admin/staff ────────
exports.getUserById = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid user ID.' })

    const user = await getPrisma().user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        suspendedAt: true,
        suspensionReason: true,
        country: true,
        region: true,
        city: true,
        nationalIdUrl: true,
        createdAt: true,
        _count: { select: { listings: true } },
        listings: {
          select: { id: true, title: true, status: true, price: true, city: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 25,
        },
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found.' })

    res.json({
      user: {
        ...serializeUser(user),
        listings: user.listings.map((l) => ({ ...l, price: l.price?.toString?.() ?? l.price })),
      },
    })
  } catch (err) {
    console.error('Get user by id error:', err)
    res.status(500).json({ error: 'Failed to load user.' })
  }
}

// ── PATCH /admin/users/:id/suspend — admin only ───────────────────────────────
exports.suspendUser = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid user ID.' })
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot suspend your own account.' })

    const target = await getPrisma().user.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'User not found.' })
    if (target.role === 'ADMIN' || target.role === 'STAFF') {
      return res.status(403).json({ error: 'Admin and staff accounts cannot be suspended here.' })
    }

    const reason = req.body?.reason ? String(req.body.reason).trim() : null

    const updated = await getPrisma().user.update({
      where: { id },
      data: { status: 'Suspended', suspendedAt: new Date(), suspendedBy: req.user.id, suspensionReason: reason },
    })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: id,
      entityLabel: updated.name || updated.companyName || updated.email,
      metadata: { reason },
    })

    res.json({ user: serializeUser(updated) })
  } catch (err) {
    console.error('Suspend user error:', err)
    res.status(500).json({ error: 'Failed to suspend user.' })
  }
}

// ── PATCH /admin/users/:id/reactivate — admin only ────────────────────────────
exports.reactivateUser = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid user ID.' })

    const target = await getPrisma().user.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'User not found.' })

    const updated = await getPrisma().user.update({
      where: { id },
      data: { status: 'Active', suspendedAt: null, suspendedBy: null, suspensionReason: null },
    })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_REACTIVATED',
      entityType: 'User',
      entityId: id,
      entityLabel: updated.name || updated.companyName || updated.email,
    })

    res.json({ user: serializeUser(updated) })
  } catch (err) {
    console.error('Reactivate user error:', err)
    res.status(500).json({ error: 'Failed to reactivate user.' })
  }
}

// ── POST /admin/invites — admin invites a staff member by email ──────────────
exports.inviteStaff = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required.' })

    const existingUser = await getPrisma().user.findFirst({ where: { email } })
    if (existingUser) return res.status(409).json({ error: 'A user with this email already exists.' })

    const existingInvite = await getPrisma().staffInvite.findFirst({ where: { email, status: 'Pending' } })
    if (existingInvite) return res.status(409).json({ error: 'An invite is already pending for this email.' })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await getPrisma().staffInvite.create({
      data: { email, token, status: 'Pending', invitedBy: req.user.id, expiresAt },
    })

    const inviter = await getPrisma().user.findUnique({ where: { id: req.user.id }, select: { name: true } })
    const dashboardUrl = process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000'
    const acceptUrl = `${dashboardUrl}/accept-invite?token=${token}`

    await sendMail({
      to: email,
      subject: 'You’re invited to join SweetCasa’s Trust Desk',
      html: `
        <p>Hi,</p>
        <p>${inviter?.name || 'A SweetCasa admin'} has invited you to join the SweetCasa admin dashboard as a staff member.</p>
        <p><a href="${acceptUrl}">Click here to set up your password</a></p>
        <p>This invite link expires in 7 days.</p>
        <p>— The SweetCasa Team</p>
      `,
    })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'STAFF_INVITED',
      entityType: 'StaffInvite',
      entityId: invite.id,
      entityLabel: email,
    })

    res.status(201).json({
      invite: {
        id: invite.id,
        email: invite.email,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
    })
  } catch (err) {
    console.error('Invite staff error:', err)
    res.status(500).json({ error: 'Failed to send invite.' })
  }
}

// ── GET /admin/invites — admin only ───────────────────────────────────────────
exports.listInvites = async (req, res) => {
  try {
    const invites = await getPrisma().staffInvite.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ invites })
  } catch (err) {
    console.error('List invites error:', err)
    res.status(500).json({ error: 'Failed to load invites.' })
  }
}

// ── PATCH /admin/invites/:id/revoke — admin only ──────────────────────────────
exports.revokeInvite = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid invite ID.' })

    const invite = await getPrisma().staffInvite.findUnique({ where: { id } })
    if (!invite) return res.status(404).json({ error: 'Invite not found.' })
    if (invite.status !== 'Pending') return res.status(400).json({ error: 'Only pending invites can be revoked.' })

    const updated = await getPrisma().staffInvite.update({ where: { id }, data: { status: 'Revoked' } })

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'STAFF_INVITE_REVOKED',
      entityType: 'StaffInvite',
      entityId: id,
      entityLabel: invite.email,
    })

    res.json({ invite: updated })
  } catch (err) {
    console.error('Revoke invite error:', err)
    res.status(500).json({ error: 'Failed to revoke invite.' })
  }
}

// ── GET /admin/invites/token/:token — PUBLIC, used by the accept-invite page ──
exports.getInviteInfo = async (req, res) => {
  try {
    const { token } = req.params
    const invite = await getPrisma().staffInvite.findUnique({ where: { token } })
    if (!invite) return res.status(404).json({ error: 'Invite not found.' })
    if (invite.status !== 'Pending') return res.status(400).json({ error: 'This invite is no longer valid.' })
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'This invite has expired.' })

    res.json({ email: invite.email })
  } catch (err) {
    console.error('Get invite info error:', err)
    res.status(500).json({ error: 'Failed to load invite.' })
  }
}

// ── POST /admin/invites/accept — PUBLIC, staff sets their password ───────────
exports.acceptInvite = async (req, res) => {
  try {
    const { token, password, name } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' })
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const invite = await getPrisma().staffInvite.findUnique({ where: { token } })
    if (!invite) return res.status(404).json({ error: 'Invite not found.' })
    if (invite.status !== 'Pending') return res.status(400).json({ error: 'This invite is no longer valid.' })
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'This invite has expired.' })

    const existingUser = await getPrisma().user.findFirst({ where: { email: invite.email } })
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists.' })

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await getPrisma().user.create({
      data: {
        name: name ? String(name).trim() : invite.email.split('@')[0],
        email: invite.email,
        password: hashedPassword,
        role: invite.role || 'STAFF',
      },
    })

    await getPrisma().staffInvite.update({
      where: { id: invite.id },
      data: { status: 'Accepted', acceptedAt: new Date() },
    })

    await logAction({
      actorId: user.id,
      actorRole: user.role,
      action: 'STAFF_JOINED',
      entityType: 'User',
      entityId: user.id,
      entityLabel: user.name || user.email,
    })

    res.status(201).json({ message: 'Account created. You can now log in.' })
  } catch (err) {
    console.error('Accept invite error:', err)
    res.status(500).json({ error: 'Failed to accept invite.' })
  }
}

// ── GET /admin/audit-logs — admin/staff ───────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { entityType, action, page = '1', limit = '30' } = req.query

    const where = {}
    if (entityType) where.entityType = String(entityType)
    if (action) where.action = String(action)

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10)))

    const [logs, total] = await Promise.all([
      getPrisma().auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().auditLog.count({ where }),
    ])

    res.json({
      logs: logs.map((l) => ({ ...l, metadata: l.metadata ? JSON.parse(l.metadata) : null })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Get audit logs error:', err)
    res.status(500).json({ error: 'Failed to load audit logs.' })
  }
}
