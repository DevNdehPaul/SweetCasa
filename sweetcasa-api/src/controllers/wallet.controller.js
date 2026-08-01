const { getPrisma } = require('../lib/prisma')
const fapshi = require('../lib/fapshi')
const { logAction } = require('../lib/audit')

const MIN_FAPSHI_AMOUNT = 100 // XAF — Fapshi's own minimum for both collection and payout

function toStr(decimal) {
  return decimal === null || decimal === undefined ? null : decimal.toString()
}

function serializeTransaction(t) {
  return {
    id: t.id,
    walletId: t.walletId,
    type: t.type,
    status: t.status,
    amount: toStr(t.amount),
    feeAmount: toStr(t.feeAmount),
    listingId: t.listingId,
    listing: t.listing ? { id: t.listing.id, title: t.listing.title } : undefined,
    relatedTransactionId: t.relatedTransactionId,
    phone: t.phone,
    medium: t.medium,
    fapshiTransId: t.fapshiTransId,
    fapshiStatus: t.fapshiStatus,
    reason: t.reason,
    initiatedBy: t.initiatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

function serializeWallet(w) {
  return {
    id: w.id,
    userId: w.userId,
    heldBalance: toStr(w.heldBalance),
    availableBalance: toStr(w.availableBalance),
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }
}

async function getOrCreateWallet(userId) {
  return getPrisma().wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

// ── GET /wallet/me — own wallet + recent transactions ────────────────────────
exports.getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id)
    const transactions = await getPrisma().transaction.findMany({
      where: { walletId: wallet.id },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ wallet: serializeWallet(wallet), transactions: transactions.map(serializeTransaction) })
  } catch (err) {
    console.error('Get wallet error:', err)
    res.status(500).json({ error: 'Failed to load wallet.' })
  }
}

// ── GET /wallet/transactions — own transactions, paginated ───────────────────
exports.listMyTransactions = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id)
    const { type, status, page = '1', limit = '25' } = req.query

    const where = { walletId: wallet.id }
    if (type) where.type = String(type)
    if (status) where.status = String(status)

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10)))

    const [transactions, total] = await Promise.all([
      getPrisma().transaction.findMany({
        where,
        include: { listing: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().transaction.count({ where }),
    ])

    res.json({ transactions: transactions.map(serializeTransaction), total, page: pageNum, pages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('List transactions error:', err)
    res.status(500).json({ error: 'Failed to load transactions.' })
  }
}

// ── POST /wallet/deposit — seeker deposits against a listing (Fapshi collection) ──
// { listingId, amount, redirectUrl? }
exports.deposit = async (req, res) => {
  try {
    const listingId = Number.parseInt(req.body?.listingId, 10)
    const amount = Number.parseInt(req.body?.amount, 10)

    if (!listingId) return res.status(400).json({ error: 'listingId is required.' })
    if (!Number.isFinite(amount) || amount < MIN_FAPSHI_AMOUNT) {
      return res.status(400).json({ error: `amount must be a number, minimum ${MIN_FAPSHI_AMOUNT} XAF.` })
    }

    const listing = await getPrisma().listing.findUnique({ where: { id: listingId } })
    if (!listing) return res.status(404).json({ error: 'Listing not found.' })
    if (listing.status !== 'Approved') {
      return res.status(400).json({ error: 'You can only deposit against an approved listing.' })
    }
    if (listing.ownerId === req.user.id) {
      return res.status(400).json({ error: 'You cannot deposit against your own listing.' })
    }

    const user = await getPrisma().user.findUnique({ where: { id: req.user.id } })
    const wallet = await getOrCreateWallet(req.user.id)

    const transaction = await getPrisma().transaction.create({
      data: {
        walletId: wallet.id,
        type: 'Deposit',
        status: 'Pending',
        amount,
        listingId,
      },
    })

    let fapshiRes
    try {
      fapshiRes = await fapshi.initiatePay({
        amount,
        email: user?.email,
        redirectUrl: req.body?.redirectUrl,
        userId: String(req.user.id),
        externalId: String(transaction.id),
        message: `SweetCasa deposit — ${listing.title}`,
      })
    } catch (err) {
      await getPrisma().transaction.update({ where: { id: transaction.id }, data: { status: 'Failed' } })
      return res.status(502).json({ error: err.message || 'Could not start the payment with Fapshi.' })
    }

    const updated = await getPrisma().transaction.update({
      where: { id: transaction.id },
      data: { fapshiTransId: fapshiRes.transId, fapshiStatus: 'CREATED' },
      include: { listing: { select: { id: true, title: true } } },
    })

    res.status(201).json({ transaction: serializeTransaction(updated), link: fapshiRes.link })
  } catch (err) {
    console.error('Deposit error:', err)
    res.status(500).json({ error: 'Failed to start deposit.' })
  }
}

// Shared logic: re-check a Deposit's Fapshi status and, if newly successful,
// credit the held balance and log the linked Hold transaction. Idempotent —
// safe to call from the verify endpoint, the webhook, or both.
async function confirmDeposit(transaction) {
  const prisma = getPrisma()

  if (transaction.type !== 'Deposit') throw new Error('Not a deposit transaction.')
  if (transaction.status !== 'Pending') return transaction // already resolved — nothing to do

  const statusRes = await fapshi.getPaymentStatus(transaction.fapshiTransId)
  const fapshiStatus = statusRes.status

  if (fapshiStatus === 'SUCCESSFUL') {
    const grossAmount = Number(transaction.amount)
    const netAmount = Number.isFinite(Number(statusRes.revenue)) ? Number(statusRes.revenue) : grossAmount
    const feeAmount = Math.max(0, grossAmount - netAmount)

    // Platform absorbs Fapshi's collection fee by default — the held amount credited
    // against the listing is the net amount Fapshi actually confirms. See SETUP notes
    // if you'd rather pass the fee on to the seeker or deduct it at release instead.
    const [updatedDeposit] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'Completed', fapshiStatus, feeAmount },
      }),
      prisma.transaction.create({
        data: {
          walletId: transaction.walletId,
          type: 'Hold',
          status: 'Completed',
          amount: netAmount,
          listingId: transaction.listingId,
          relatedTransactionId: transaction.id,
        },
      }),
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { heldBalance: { increment: netAmount } },
      }),
    ])
    return updatedDeposit
  }

  if (fapshiStatus === 'FAILED' || fapshiStatus === 'EXPIRED') {
    return prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: fapshiStatus === 'EXPIRED' ? 'Cancelled' : 'Failed', fapshiStatus },
    })
  }

  // CREATED / PENDING — still in progress, nothing to change yet.
  if (fapshiStatus && fapshiStatus !== transaction.fapshiStatus) {
    return prisma.transaction.update({ where: { id: transaction.id }, data: { fapshiStatus } })
  }
  return transaction
}

// ── GET /wallet/deposit/:id/verify — frontend calls this after the Fapshi
// checkout redirect, to sync status without waiting on the webhook ───────────
exports.verifyDeposit = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid transaction ID.' })

    const transaction = await getPrisma().transaction.findUnique({ where: { id }, include: { wallet: true } })
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' })
    if (transaction.wallet.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const updated = await confirmDeposit(transaction)
    res.json({ transaction: serializeTransaction(updated) })
  } catch (err) {
    console.error('Verify deposit error:', err)
    res.status(500).json({ error: err.message || 'Failed to verify deposit.' })
  }
}

// ── POST /wallet/webhooks/fapshi — PUBLIC, called by Fapshi on status change ─
exports.fapshiWebhook = async (req, res) => {
  try {
    if (process.env.FAPSHI_WEBHOOK_SECRET) {
      const provided = req.headers['x-wh-secret']
      if (provided !== process.env.FAPSHI_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Invalid webhook secret.' })
      }
    }

    const transId = req.body?.transId
    if (!transId) return res.status(200).json({ ok: true }) // nothing to do, but ack so Fapshi doesn't retry

    const transaction = await getPrisma().transaction.findFirst({ where: { fapshiTransId: transId, type: 'Deposit' } })
    if (!transaction) return res.status(200).json({ ok: true }) // unknown transaction — ack anyway

    await confirmDeposit(transaction)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Fapshi webhook error:', err)
    // Still 200 — Fapshi only sends one attempt regardless, no point making it retry a broken handler.
    res.status(200).json({ ok: false })
  }
}

// ── PATCH /wallet/transactions/:id/release — admin/staff moves held funds to the owner ──
// :id refers to the Hold transaction. { note? }
exports.releaseHold = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid transaction ID.' })

    const hold = await getPrisma().transaction.findUnique({
      where: { id },
      include: { listing: true },
    })
    if (!hold) return res.status(404).json({ error: 'Hold not found.' })
    if (hold.type !== 'Hold' || hold.status !== 'Completed') {
      return res.status(400).json({ error: 'Only a completed Hold can be released.' })
    }
    const alreadyMoved = await getPrisma().transaction.findFirst({
      where: { relatedTransactionId: hold.id, type: { in: ['Release', 'Refund'] } },
    })
    if (alreadyMoved) return res.status(409).json({ error: `This hold was already ${alreadyMoved.type.toLowerCase()}d.` })

    if (!hold.listing?.ownerId) return res.status(400).json({ error: 'This listing has no owner to release funds to.' })

    const ownerWallet = await getOrCreateWallet(hold.listing.ownerId)
    const amount = Number(hold.amount)

    const [release] = await getPrisma().$transaction([
      getPrisma().transaction.create({
        data: {
          walletId: ownerWallet.id,
          type: 'Release',
          status: 'Completed',
          amount,
          listingId: hold.listingId,
          relatedTransactionId: hold.id,
          initiatedBy: req.user.id,
          reason: req.body?.note ? String(req.body.note).trim() : null,
        },
      }),
      getPrisma().wallet.update({ where: { id: hold.walletId }, data: { heldBalance: { decrement: amount } } }),
      getPrisma().wallet.update({ where: { id: ownerWallet.id }, data: { availableBalance: { increment: amount } } }),
    ])

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ESCROW_RELEASED',
      entityType: 'Transaction',
      entityId: hold.id,
      entityLabel: hold.listing?.title,
      metadata: { amount, note: req.body?.note },
    })

    res.json({ transaction: serializeTransaction(release) })
  } catch (err) {
    console.error('Release hold error:', err)
    res.status(500).json({ error: 'Failed to release funds.' })
  }
}

// ── POST /wallet/transactions/:id/refund — admin/staff pays a held deposit back to the seeker ──
// :id refers to the Hold transaction. { phone?, medium?, note? }
exports.refundHold = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid transaction ID.' })

    const hold = await getPrisma().transaction.findUnique({
      where: { id },
      include: { listing: true, wallet: { include: { user: true } } },
    })
    if (!hold) return res.status(404).json({ error: 'Hold not found.' })
    if (hold.type !== 'Hold' || hold.status !== 'Completed') {
      return res.status(400).json({ error: 'Only a completed Hold can be refunded.' })
    }
    const alreadyMoved = await getPrisma().transaction.findFirst({
      where: { relatedTransactionId: hold.id, type: { in: ['Release', 'Refund'] } },
    })
    if (alreadyMoved) return res.status(409).json({ error: `This hold was already ${alreadyMoved.type.toLowerCase()}d.` })

    const amount = Number(hold.amount)
    const seeker = hold.wallet.user
    const phone = req.body?.phone ? String(req.body.phone).trim() : (seeker.phone ? String(seeker.phone) : null)
    if (!phone) return res.status(400).json({ error: "A phone number is required to refund the seeker (none on file for this user)." })

    // Call Fapshi first — only touch the ledger once the payout is actually accepted.
    let fapshiRes
    try {
      fapshiRes = await fapshi.payout({
        amount,
        phone,
        medium: req.body?.medium,
        name: seeker.name,
        externalId: `refund-${hold.id}`,
        message: `SweetCasa refund — ${hold.listing?.title || 'listing'}`,
      })
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Fapshi refund payout failed.' })
    }

    const [refund] = await getPrisma().$transaction([
      getPrisma().transaction.create({
        data: {
          walletId: hold.walletId,
          type: 'Refund',
          status: 'Completed',
          amount,
          listingId: hold.listingId,
          relatedTransactionId: hold.id,
          phone,
          medium: req.body?.medium || null,
          fapshiTransId: fapshiRes.transId,
          initiatedBy: req.user.id,
          reason: req.body?.note ? String(req.body.note).trim() : null,
        },
      }),
      getPrisma().wallet.update({ where: { id: hold.walletId }, data: { heldBalance: { decrement: amount } } }),
    ])

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ESCROW_REFUNDED',
      entityType: 'Transaction',
      entityId: hold.id,
      entityLabel: hold.listing?.title,
      metadata: { amount, phone, note: req.body?.note },
    })

    res.json({ transaction: serializeTransaction(refund) })
  } catch (err) {
    console.error('Refund hold error:', err)
    res.status(500).json({ error: 'Failed to refund.' })
  }
}

// ── POST /wallet/withdraw — owner self-service payout of their available balance ──
// { amount, phone, medium? }
exports.withdraw = async (req, res) => {
  try {
    const amount = Number.parseInt(req.body?.amount, 10)
    const phone = req.body?.phone ? String(req.body.phone).trim() : null

    if (!Number.isFinite(amount) || amount < MIN_FAPSHI_AMOUNT) {
      return res.status(400).json({ error: `amount must be a number, minimum ${MIN_FAPSHI_AMOUNT} XAF.` })
    }
    if (!phone && req.body?.medium !== 'fapshi') {
      return res.status(400).json({ error: 'phone is required.' })
    }

    const wallet = await getOrCreateWallet(req.user.id)
    if (Number(wallet.availableBalance) < amount) {
      return res.status(400).json({ error: 'Insufficient available balance.' })
    }

    const user = await getPrisma().user.findUnique({ where: { id: req.user.id } })

    let fapshiRes
    try {
      fapshiRes = await fapshi.payout({
        amount,
        phone: phone || undefined,
        medium: req.body?.medium,
        name: user?.name,
        email: req.body?.medium === 'fapshi' ? user?.email : undefined,
        externalId: `withdraw-${req.user.id}-${Date.now()}`,
        message: 'SweetCasa withdrawal',
      })
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Fapshi withdrawal payout failed.' })
    }

    const [transaction] = await getPrisma().$transaction([
      getPrisma().transaction.create({
        data: {
          walletId: wallet.id,
          type: 'Withdrawal',
          status: 'Completed',
          amount,
          phone,
          medium: req.body?.medium || null,
          fapshiTransId: fapshiRes.transId,
          initiatedBy: req.user.id,
        },
      }),
      getPrisma().wallet.update({ where: { id: wallet.id }, data: { availableBalance: { decrement: amount } } }),
    ])

    res.status(201).json({ transaction: serializeTransaction(transaction) })
  } catch (err) {
    console.error('Withdraw error:', err)
    res.status(500).json({ error: 'Failed to withdraw.' })
  }
}

// ── GET /admin/wallet/transactions — admin/staff, all wallets ────────────────
exports.adminListTransactions = async (req, res) => {
  try {
    const { type, status, page = '1', limit = '30' } = req.query

    const where = {}
    if (type) where.type = String(type)
    if (status) where.status = String(status)

    const pageNum  = Math.max(1, Number.parseInt(page, 10))
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10)))

    const [transactions, total] = await Promise.all([
      getPrisma().transaction.findMany({
        where,
        include: {
          listing: { select: { id: true, title: true } },
          wallet: { select: { id: true, userId: true, user: { select: { id: true, name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().transaction.count({ where }),
    ])

    res.json({
      transactions: transactions.map((t) => ({ ...serializeTransaction(t), walletOwner: t.wallet.user })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    console.error('Admin list transactions error:', err)
    res.status(500).json({ error: 'Failed to load transactions.' })
  }
}
