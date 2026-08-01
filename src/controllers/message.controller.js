const { getPrisma } = require('../lib/prisma')
const { createNotification } = require('../services/notification.service')
const { emitToUser, emitToConversation } = require('../lib/socket')

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatConvTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── GET /messages/conversations ─────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        buyer: { select: { id: true, name: true, companyName: true } },
        seller: { select: { id: true, name: true, companyName: true } },
        listing: {
          select: {
            id: true, title: true, city: true, region: true,
            price: true, type: true,
            images: {
              where: { isPrimary: true },
              select: { imageUrl: true },
              take: 1,
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, text: true, senderId: true, seen: true, createdAt: true },
        },
        // Actual unread count: messages from the OTHER user that are unseen
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                seen: false,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = conversations.map((conv) => {
      const other = conv.buyerId === userId ? conv.seller : conv.buyer
      const lastMsg = conv.messages[0] ?? null

      return {
        id: conv.id,
        otherUser: {
          id: other.id,
          name: other.companyName || other.name,
        },
        listing: conv.listing
          ? {
            id: conv.listing.id,
            title: conv.listing.title,
            location: `${conv.listing.city}, ${conv.listing.region}`,
            price: conv.listing.price?.toString() ?? '',
            type: conv.listing.type,
            imageUrl: conv.listing.images[0]?.imageUrl ?? null,
          }
          : null,
        lastMessage: lastMsg
          ? {
            text: lastMsg.text,
            fromMe: lastMsg.senderId === userId,
            seen: lastMsg.seen,
            time: formatConvTime(lastMsg.createdAt),
          }
          : null,
        unreadCount: conv._count.messages,   // ← real count now
        updatedAt: conv.updatedAt,
      }
    })

    res.json({ conversations: result })
  } catch (err) {
    console.error('getConversations error:', err)
    res.status(500).json({ error: 'Failed to fetch conversations.' })
  }
}

// ─── GET /messages/conversations/:id ─────────────────────────────────────────
exports.getMessages = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id
  const conversationId = Number(req.params.id)

  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation id.' })
  }

  try {
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        buyer: { select: { id: true, name: true, companyName: true } },
        seller: { select: { id: true, name: true, companyName: true } },
        listing: {
          select: {
            id: true, title: true, city: true, region: true, price: true,
            images: {
              where: { isPrimary: true },
              select: { imageUrl: true },
              take: 1,
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, senderId: true, seen: true, createdAt: true },
        },
      },
    })

    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })

    // Mark received messages as seen
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, seen: false },
      data: { seen: true },
    })

    const other = conv.buyerId === userId ? conv.seller : conv.buyer

    res.json({
      conversation: {
        id: conv.id,
        otherUser: { id: other.id, name: other.companyName || other.name },
        listing: conv.listing
          ? {
            id: conv.listing.id,
            title: conv.listing.title,
            location: `${conv.listing.city}, ${conv.listing.region}`,
            price: conv.listing.price?.toString() ?? '',
            imageUrl: conv.listing.images[0]?.imageUrl ?? null,
          }
          : null,
        messages: conv.messages.map((m) => ({
          id: String(m.id),
          text: m.text,
          fromMe: m.senderId === userId,
          seen: m.seen,
          time: formatTime(m.createdAt),
        })),
      },
    })
  } catch (err) {
    console.error('getMessages error:', err)
    res.status(500).json({ error: 'Failed to fetch messages.' })
  }
}

// ─── POST /messages/conversations ────────────────────────────────────────────
exports.startConversation = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id
  const { listingId, recipientId } = req.body

  if (!recipientId) return res.status(400).json({ error: 'recipientId is required.' })

  const parsedListingId = listingId ? Number(listingId) : null
  const parsedRecipientId = Number(recipientId)
  if (!Number.isFinite(parsedRecipientId)) return res.status(400).json({ error: 'Invalid recipientId.' })

  try {
    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    const isBuyer = requester?.role !== 'SELLER'
    const buyerId = isBuyer ? userId : parsedRecipientId
    const sellerId = isBuyer ? parsedRecipientId : userId

    let conv = await prisma.conversation.findFirst({
      where: parsedListingId
        ? { listingId: parsedListingId, buyerId, sellerId }
        : { buyerId, sellerId },
    })

    if (!conv) {
      conv = await prisma.conversation.create({
        data: { listingId: parsedListingId, buyerId, sellerId },
      })
    }

    res.status(201).json({ conversationId: conv.id })
  } catch (err) {
    console.error('startConversation error:', err)
    res.status(500).json({ error: 'Failed to start conversation.' })
  }
}

// ─── POST /messages/conversations/:id/messages ───────────────────────────────
exports.sendMessage = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id
  const conversationId = Number(req.params.id)
  const { text } = req.body

  if (!Number.isFinite(conversationId)) return res.status(400).json({ error: 'Invalid conversation id.' })
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Message text is required.' })

  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: userId }, { sellerId: userId }] },
    })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })

    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, text: String(text).trim() },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Notify the other user about the new message (best-effort)
    const recipientId = conv.buyerId === userId ? conv.sellerId : conv.buyerId
    if (recipientId) {
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, companyName: true },
      })
      const senderName = sender?.companyName || sender?.name || 'Someone'
      await createNotification(recipientId, {
        type: 'new_message',
        title: `New message from ${senderName}`,
        body: String(text).trim().substring(0, 100),
        data: { conversationId, senderId: userId, listingId: conv.listingId },
      })

      // Real-time delivery via Socket.IO (best-effort)
      const payload = {
        id: String(message.id),
        text: message.text,
        fromMe: false,
        seen: false,
        time: formatTime(message.createdAt),
        conversationId,
        senderId: userId,
        senderName,
      }
      emitToUser(recipientId, 'new_message', payload)
      emitToConversation(conversationId, 'message:new', payload)
    }

    res.status(201).json({
      message: {
        id: String(message.id),
        text: message.text,
        fromMe: true,
        seen: false,
        time: formatTime(message.createdAt),
      },
    })
  } catch (err) {
    console.error('sendMessage error:', err)
    res.status(500).json({ error: 'Failed to send message.' })
  }
}

// ─── PATCH /messages/conversations/:id/read ──────────────────────────────────
exports.markAsRead = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id
  const conversationId = Number(req.params.id)

  if (!Number.isFinite(conversationId)) return res.status(400).json({ error: 'Invalid conversation id.' })

  try {
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, seen: false },
      data: { seen: true },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('markAsRead error:', err)
    res.status(500).json({ error: 'Failed to mark messages as read.' })
  }
}

// ─── DELETE /messages/conversations/:id ──────────────────────────────────────
exports.deleteConversation = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id
  const conversationId = Number(req.params.id)

  if (!Number.isFinite(conversationId)) return res.status(400).json({ error: 'Invalid conversation id.' })

  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: userId }, { sellerId: userId }] },
    })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })

    // Cascade deletes messages automatically (schema: onDelete: Cascade)
    await prisma.conversation.delete({ where: { id: conversationId } })

    res.json({ ok: true })
  } catch (err) {
    console.error('deleteConversation error:', err)
    res.status(500).json({ error: 'Failed to delete conversation.' })
  }
}

// ─── GET /messages/stats ─────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  const prisma = getPrisma()
  const userId = req.user.id

  try {
    // All conversations this user is part of
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: {
        id: true,
        listingId: true,
        _count: {
          select: {
            messages: {
              where: { senderId: { not: userId }, seen: false },
            },
          },
        },
      },
    })

    // Total unread messages across all conversations
    const unreadMessages = conversations.reduce(
      (sum, c) => sum + c._count.messages,
      0,
    )

    // Lead conversion: how many of this seller's listings have at least one conversation
    const totalListings = await prisma.listing.count({
      where: { sellerId: userId },
    })

    const listingsWithLeads = totalListings
      ? await prisma.listing.count({
        where: {
          sellerId: userId,
          conversations: { some: {} },
        },
      })
      : 0

    const leadConversion =
      totalListings > 0
        ? ((listingsWithLeads / totalListings) * 100).toFixed(1) + '%'
        : '0.0%'

    // Total conversations (useful for the client)
    const totalConversations = conversations.length

    res.json({ unreadMessages, leadConversion, totalConversations, totalListings })
  } catch (err) {
    console.error('getStats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats.' })
  }
}
