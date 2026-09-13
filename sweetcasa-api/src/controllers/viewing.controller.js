const { getPrisma } = require('../lib/prisma')
const { createNotification } = require('../services/notification.service')

const VALID_STATUSES = new Set(['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function parseDateOnly(value) {
  if (!DATE_RE.test(String(value || ''))) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function serialize(v) {
  return {
    ...v,
    preferredDate: v.preferredDate?.toISOString().slice(0, 10) ?? null,
    confirmedDate: v.confirmedDate?.toISOString().slice(0, 10) ?? null,
    createdAt: v.createdAt?.toISOString?.() ?? v.createdAt,
    updatedAt: v.updatedAt?.toISOString?.() ?? v.updatedAt,
    listing: v.listing ? {
      ...v.listing,
      price: v.listing.price?.toString?.() ?? v.listing.price,
      imageUrl: v.listing.images?.[0]?.imageUrl ?? null,
      images: undefined,
    } : undefined,
  }
}

const includeDetails = {
  listing: {
    select: {
      id: true, title: true, city: true, region: true, neighborhood: true,
      price: true, type: true,
      images: { where: { isPrimary: true }, select: { imageUrl: true }, take: 1 },
    },
  },
  requester: { select: { id: true, name: true, companyName: true, phone: true } },
  agent: { select: { id: true, name: true, companyName: true, phone: true } },
}

exports.createViewingRequest = async (req, res) => {
  const prisma = getPrisma()
  const requesterId = req.user.id
  const listingId = Number(req.body.listingId)
  const preferredDate = parseDateOnly(req.body.preferredDate)
  const preferredTime = String(req.body.preferredTime || '').trim()
  const note = String(req.body.note || '').trim() || null

  if (!Number.isFinite(listingId)) return res.status(400).json({ error: 'Invalid listingId.' })
  if (!preferredDate) return res.status(400).json({ error: 'preferredDate must be YYYY-MM-DD.' })
  if (!TIME_RE.test(preferredTime)) return res.status(400).json({ error: 'preferredTime must be HH:MM.' })
  if (note && note.length > 1000) return res.status(400).json({ error: 'Note is too long.' })

  const requestedMoment = new Date(`${req.body.preferredDate}T${preferredTime}:00`)
  if (Number.isNaN(requestedMoment.getTime()) || requestedMoment <= new Date()) {
    return res.status(400).json({ error: 'Viewing date and time must be in the future.' })
  }

  try {
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: 'Approved' },
      select: { id: true, title: true, ownerId: true, state: true },
    })
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })
    if (!listing.ownerId) return res.status(400).json({ error: 'This listing does not have a property agent.' })
    if (listing.ownerId === requesterId) return res.status(400).json({ error: 'You cannot book a viewing for your own listing.' })
    if (String(listing.state).toLowerCase() !== 'available') return res.status(409).json({ error: 'This property is not currently available.' })

    const duplicate = await prisma.viewingRequest.findFirst({
      where: { listingId, requesterId, status: { in: ['PENDING', 'CONFIRMED'] } },
    })
    if (duplicate) {
      return res.status(409).json({
        error: 'You already have an active viewing request for this property.',
        viewingRequestId: duplicate.id,
      })
    }

    const viewing = await prisma.viewingRequest.create({
      data: { listingId, requesterId, agentId: listing.ownerId, preferredDate, preferredTime, note },
      include: includeDetails,
    })

    await createNotification(listing.ownerId, {
      type: 'viewing_request',
      title: 'New viewing request',
      body: `Someone requested to view "${listing.title}" on ${req.body.preferredDate} at ${preferredTime}.`,
      data: { viewingRequestId: viewing.id, listingId },
    })

    return res.status(201).json({ viewingRequest: serialize(viewing) })
  } catch (err) {
    console.error('createViewingRequest error:', err)
    return res.status(500).json({ error: 'Failed to create viewing request.' })
  }
}

exports.getMyViewingRequests = async (req, res) => {
  try {
    const rows = await getPrisma().viewingRequest.findMany({
      where: { requesterId: req.user.id }, include: includeDetails, orderBy: { createdAt: 'desc' },
    })
    res.json({ viewingRequests: rows.map(serialize) })
  } catch (err) {
    console.error('getMyViewingRequests error:', err)
    res.status(500).json({ error: 'Failed to fetch viewing requests.' })
  }
}

exports.getReceivedViewingRequests = async (req, res) => {
  try {
    const rows = await getPrisma().viewingRequest.findMany({
      where: { agentId: req.user.id }, include: includeDetails, orderBy: { createdAt: 'desc' },
    })
    res.json({ viewingRequests: rows.map(serialize) })
  } catch (err) {
    console.error('getReceivedViewingRequests error:', err)
    res.status(500).json({ error: 'Failed to fetch received viewing requests.' })
  }
}

exports.getViewingRequest = async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid viewing request id.' })
  try {
    const row = await getPrisma().viewingRequest.findFirst({
      where: { id, OR: [{ requesterId: req.user.id }, { agentId: req.user.id }] }, include: includeDetails,
    })
    if (!row) return res.status(404).json({ error: 'Viewing request not found.' })
    res.json({ viewingRequest: serialize(row) })
  } catch (err) {
    console.error('getViewingRequest error:', err)
    res.status(500).json({ error: 'Failed to fetch viewing request.' })
  }
}

async function agentDecision(req, res, status) {
  const prisma = getPrisma()
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid viewing request id.' })
  const agentMessage = String(req.body.agentMessage || '').trim() || null
  if (agentMessage && agentMessage.length > 1000) return res.status(400).json({ error: 'Agent message is too long.' })

  try {
    const current = await prisma.viewingRequest.findFirst({ where: { id, agentId: req.user.id } })
    if (!current) return res.status(404).json({ error: 'Viewing request not found.' })
    if (current.status !== 'PENDING') return res.status(409).json({ error: `This request is already ${current.status.toLowerCase()}.` })

    const data = { status, agentMessage }
    if (status === 'CONFIRMED') {
      const confirmedDate = req.body.confirmedDate ? parseDateOnly(req.body.confirmedDate) : current.preferredDate
      const confirmedTime = String(req.body.confirmedTime || current.preferredTime).trim()
      if (!confirmedDate) return res.status(400).json({ error: 'confirmedDate must be YYYY-MM-DD.' })
      if (!TIME_RE.test(confirmedTime)) return res.status(400).json({ error: 'confirmedTime must be HH:MM.' })
      data.confirmedDate = confirmedDate
      data.confirmedTime = confirmedTime
    }

    const updated = await prisma.viewingRequest.update({ where: { id }, data, include: includeDetails })
    const title = status === 'CONFIRMED' ? 'Viewing confirmed' : 'Viewing request declined'
    const body = status === 'CONFIRMED'
      ? `Your viewing for "${updated.listing.title}" is confirmed for ${serialize(updated).confirmedDate} at ${updated.confirmedTime}.`
      : `Your viewing request for "${updated.listing.title}" was declined.`
    await createNotification(updated.requesterId, {
      type: status === 'CONFIRMED' ? 'viewing_confirmed' : 'viewing_declined', title, body,
      data: { viewingRequestId: updated.id, listingId: updated.listingId },
    })
    res.json({ viewingRequest: serialize(updated) })
  } catch (err) {
    console.error('agentDecision error:', err)
    res.status(500).json({ error: 'Failed to update viewing request.' })
  }
}

exports.confirmViewingRequest = (req, res) => agentDecision(req, res, 'CONFIRMED')
exports.declineViewingRequest = (req, res) => agentDecision(req, res, 'DECLINED')

exports.cancelViewingRequest = async (req, res) => {
  const prisma = getPrisma()
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid viewing request id.' })
  try {
    const current = await prisma.viewingRequest.findFirst({ where: { id, requesterId: req.user.id } })
    if (!current) return res.status(404).json({ error: 'Viewing request not found.' })
    if (!['PENDING', 'CONFIRMED'].includes(current.status)) return res.status(409).json({ error: `This request is already ${current.status.toLowerCase()}.` })
    const updated = await prisma.viewingRequest.update({ where: { id }, data: { status: 'CANCELLED' }, include: includeDetails })
    await createNotification(updated.agentId, {
      type: 'viewing_cancelled', title: 'Viewing cancelled',
      body: `A viewing for "${updated.listing.title}" has been cancelled.`,
      data: { viewingRequestId: updated.id, listingId: updated.listingId },
    })
    res.json({ viewingRequest: serialize(updated) })
  } catch (err) {
    console.error('cancelViewingRequest error:', err)
    res.status(500).json({ error: 'Failed to cancel viewing request.' })
  }
}
