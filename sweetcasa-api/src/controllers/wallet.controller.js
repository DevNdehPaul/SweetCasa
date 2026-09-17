const { getPrisma } = require('../lib/prisma')
const fapshi = require('../lib/fapshi')
const { logAction } = require('../lib/audit')
const { getIO } = require('../lib/socket')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const streamifier = require('streamifier')

const MIN_FAPSHI_AMOUNT = 100 // XAF — Fapshi's own minimum for both collection and payout
const FAPSHI_FEE_RATE = 0.03  // Fapshi's per-transaction collection fee (see https://www.fapshi.com/en/pricing)
                                // Charged ON TOP of the escrow amount so the full amount the seeker
                                // intends to lock actually reaches the Hold, instead of Fapshi's cut
                                // silently shrinking it.

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
    resolutionKey: t.resolutionKey,
    phone: t.phone,
    medium: t.medium,
    fapshiTransId: t.fapshiTransId,
    fapshiStatus: t.fapshiStatus,
    reason: t.reason,
    initiatedBy: t.initiatedBy,
    rentAmount: toStr(t.rentAmount),
    cautionFeeAmount: toStr(t.cautionFeeAmount),
    platformCommissionAmount: toStr(t.platformCommissionAmount),
    landlordPayoutAmount: toStr(t.landlordPayoutAmount),
    signatureName: t.signatureName,
    signedAt: t.signedAt,
    moveInDate: t.moveInDate,
    protectionEndsAt: t.protectionEndsAt,
    resolvedAs: t.resolvedAs ?? undefined,
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

// Pushes a deposit's terminal status straight to the depositor's open app,
// so the frontend can close its "waiting for approval" spinner the instant
// this fires instead of waiting on its own polling cadence. Never allowed
// to throw — a missing/dropped socket must never block the underlying
// deposit/verify/cancel flow that called it.
function emitDepositUpdate(walletUserId, transaction) {
  if (!walletUserId) return
  try {
    getIO().to(`user:${walletUserId}`).emit('wallet:deposit_update', serializeTransaction(transaction))
  } catch (err) {
    console.error('[socket] failed to emit deposit update:', err.message)
  }
}

// A Hold's Release lives on the OWNER's wallet, not the depositor's — so a
// seeker looking at their own transactions can't tell "still locked" from
// "released to the owner" just from rows in their own wallet. This looks up
// resolution status across all wallets for whichever Hold rows are present.
async function attachHoldResolution(transactions) {
  const holdIds = transactions.filter((t) => t.type === 'Hold').map((t) => t.id)
  if (!holdIds.length) return transactions

  const resolutions = await getPrisma().transaction.findMany({
    where: { relatedTransactionId: { in: holdIds }, type: { in: ['Release', 'Refund'] } },
    select: { relatedTransactionId: true, type: true },
  })
  const resolvedMap = new Map(resolutions.map((r) => [r.relatedTransactionId, r.type]))

  return transactions.map((t) =>
    t.type === 'Hold' ? { ...t, resolvedAs: resolvedMap.get(t.id) || null } : t
  )
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
    await releaseMaturedHolds()
    const wallet = await getOrCreateWallet(req.user.id)
    const rawTransactions = await getPrisma().transaction.findMany({
      where: { walletId: wallet.id },
      include: { listing: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const transactions = await attachHoldResolution(rawTransactions)
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

    const [rawTransactions, total] = await Promise.all([
      getPrisma().transaction.findMany({
        where,
        include: { listing: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().transaction.count({ where }),
    ])
    const transactions = await attachHoldResolution(rawTransactions)

    res.json({ transactions: transactions.map(serializeTransaction), total, page: pageNum, pages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('List transactions error:', err)
    res.status(500).json({ error: 'Failed to load transactions.' })
  }
}

// ── POST /wallet/deposit — seeker deposits against a listing (Fapshi Direct Pay) ──
// { listingId, amount, phone, medium }
exports.deposit = async (req, res) => {
  try {
    const amount = Number.parseInt(req.body?.amount, 10)
    const phone = req.body?.phone ? String(req.body.phone).trim() : null
    const medium = req.body?.medium ? String(req.body.medium).trim() : null

    if (!Number.isFinite(amount) || amount < MIN_FAPSHI_AMOUNT) {
      return res.status(400).json({ error: `amount must be a number, minimum ${MIN_FAPSHI_AMOUNT} XAF.` })
    }
    if (!phone) return res.status(400).json({ error: 'phone is required.' })
    if (medium !== 'mobile money' && medium !== 'orange money') {
      return res.status(400).json({ error: "medium must be 'mobile money' or 'orange money'." })
    }

    const user = await getPrisma().user.findUnique({ where: { id: req.user.id } })
    const wallet = await getOrCreateWallet(req.user.id)
    const feeAmount = Math.ceil(amount * FAPSHI_FEE_RATE)
    const chargeAmount = amount + feeAmount

    const transaction = await getPrisma().transaction.create({
      data: { walletId: wallet.id, type: 'Deposit', status: 'Pending', amount, feeAmount, phone, medium },
    })

    let fapshiRes
    try {
      fapshiRes = await fapshi.directPay({
        amount: chargeAmount, phone, medium, email: user?.email,
        userId: String(req.user.id), externalId: String(transaction.id),
        message: 'SweetCasa escrow wallet deposit',
      })
    } catch (err) {
      const failed = await getPrisma().transaction.update({ where: { id: transaction.id }, data: { status: 'Failed' } })
      emitDepositUpdate(req.user.id, failed)
      return res.status(502).json({ error: err.message || 'Could not start the payment with Fapshi.' })
    }

    const updated = await getPrisma().transaction.update({
      where: { id: transaction.id },
      data: { fapshiTransId: fapshiRes.transId, fapshiStatus: 'CREATED' },
    })
    res.status(201).json({ transaction: serializeTransaction(updated) })
  } catch (err) {
    console.error('Deposit error:', err)
    res.status(500).json({ error: 'Failed to start deposit.' })
  }
}

// Shared logic: re-check a Deposit's Fapshi status and, if newly successful,
// credit the held balance and log the linked Hold transaction. Idempotent —
// safe to call from the verify endpoint, the webhook, or the cancel fallback.
// `transaction` must include its `wallet` relation (for the userId used to
// push the socket event) — every caller below fetches it that way.
async function confirmDeposit(transaction) {
  const prisma = getPrisma()

  if (transaction.type !== 'Deposit') throw new Error('Not a deposit transaction.')
  if (transaction.status !== 'Pending') return transaction // already resolved — nothing to do

  const walletUserId = transaction.wallet?.userId

  const statusRes = await fapshi.getPaymentStatus(transaction.fapshiTransId)
  const fapshiStatus = statusRes.status

    if (fapshiStatus === 'SUCCESSFUL') {
    // amount + feeAmount were fixed at deposit time (feeAmount = ceil(amount * 3%),
    // charged to Fapshi on top of amount) — so the full `amount` the seeker was
    // quoted is always what gets held, regardless of Fapshi's own fee accounting.
    const netAmount = Number(transaction.amount)

    const [updatedDeposit] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'Completed', fapshiStatus },
      }),
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { availableBalance: { increment: netAmount } },
      }),
    ])
    emitDepositUpdate(walletUserId, updatedDeposit)
    return updatedDeposit
  }

  if (fapshiStatus === 'FAILED' || fapshiStatus === 'EXPIRED') {
    const resolved = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: fapshiStatus === 'EXPIRED' ? 'Cancelled' : 'Failed',
        fapshiStatus,
        reason: statusRes.reason || statusRes.message || null,
      },
    })
    emitDepositUpdate(walletUserId, resolved)
    return resolved
  }

  // CREATED / PENDING — still in progress, nothing final to announce yet.
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
// This is the fastest path to the frontend: Fapshi hits this the moment MTN/
// Orange reports the person approved or declined, and we immediately push
// that straight through to their open app via the socket in confirmDeposit.
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

    const transaction = await getPrisma().transaction.findFirst({
      where: { fapshiTransId: transId, type: 'Deposit' },
      include: { wallet: true },
    })
    if (!transaction) return res.status(200).json({ ok: true }) // unknown transaction — ack anyway

    await confirmDeposit(transaction)
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Fapshi webhook error:', err)
    // Still 200 — Fapshi only sends one attempt regardless, no point making it retry a broken handler.
    res.status(200).json({ ok: false })
  }
}

// ── PATCH /wallet/deposit/:id/cancel — frontend calls this when its 40s wait
// times out with no resolution, so the deposit doesn't hang as Pending forever ──
exports.cancelDeposit = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'Invalid transaction ID.' })

    const transaction = await getPrisma().transaction.findUnique({ where: { id }, include: { wallet: true } })
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' })
    if (transaction.wallet.userId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      return res.status(403).json({ error: 'Access denied.' })
    }
    if (transaction.type !== 'Deposit') return res.status(400).json({ error: 'Not a deposit transaction.' })
    if (transaction.status !== 'Pending') {
      // Already resolved (e.g. by the webhook) — just report what it is now.
      return res.json({ transaction: serializeTransaction(transaction) })
    }

    // Last-chance check with Fapshi — but this call can legitimately fail
    // (rate limits, network blips), and that must NEVER stop us from cancelling.
    // A failed courtesy check just means we fall through to cancelling below.
    let resolved = transaction
    try {
      resolved = await confirmDeposit(transaction)
    } catch (checkErr) {
      console.error('Cancel deposit — final Fapshi check failed, cancelling anyway:', checkErr.message)
    }

    if (resolved.status !== 'Pending') {
      return res.json({ transaction: serializeTransaction(resolved) })
    }

    const cancelled = await getPrisma().transaction.update({
      where: { id },
      data: { status: 'Cancelled', reason: 'Timed out waiting for approval.' },
    })
    emitDepositUpdate(transaction.wallet.userId, cancelled)
    res.json({ transaction: serializeTransaction(cancelled) })
  } catch (err) {
    console.error('Cancel deposit error:', err)
    res.status(500).json({ error: 'Failed to cancel deposit.' })
  }
}


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
}

async function uploadAgreementHtml(html, fileName) {
  ensureCloudinaryConfigured()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'sweetcasa/signed-agreements', resource_type: 'raw',
      public_id: fileName.replace(/\.html$/i, ''), format: 'html', overwrite: false,
    }, (error, result) => error ? reject(error) : resolve(result))
    streamifier.createReadStream(Buffer.from(html, 'utf8')).pipe(stream)
  })
}

function requiredForListing(listing) {
  const price = Number(listing.price || 0)
  if (listing.paymentFrequency === 'For Sale') {
    return { required: Math.ceil(price * 0.25), rentAmount: 0, cautionFeeAmount: 0, kind: 'SALE' }
  }
  const cautionFeeAmount = Number(listing.cautionFee || 0)
  return { required: price + cautionFeeAmount, rentAmount: price, cautionFeeAmount, kind: 'RENT' }
}

// POST /wallet/purchase — converts available seeker funds into a protected Hold only after signing.
exports.purchase = async (req, res) => {
  try {
    const listingId = Number.parseInt(req.body?.listingId, 10)
    const signatureName = String(req.body?.signatureName || '').trim()
    const moveInDateRaw = req.body?.moveInDate
    if (!listingId) return res.status(400).json({ error: 'listingId is required.' })
    if (signatureName.length < 2) return res.status(400).json({ error: 'Your electronic signature is required.' })

    const listing = await getPrisma().listing.findUnique({
      where: { id: listingId }, include: { owner: { select: { id: true, name: true, email: true } } },
    })
    if (!listing || listing.status !== 'Approved') return res.status(404).json({ error: 'Approved listing not found.' })
    if (listing.ownerId === req.user.id) return res.status(400).json({ error: 'You cannot purchase your own listing.' })

    const amounts = requiredForListing(listing)
    let moveInDate = null
    if (amounts.kind === 'RENT') {
      moveInDate = new Date(moveInDateRaw)
      if (!moveInDateRaw || Number.isNaN(moveInDate.getTime())) return res.status(400).json({ error: 'A valid move-in date is required.' })
    } else {
      moveInDate = new Date()
    }
    const protectionEndsAt = new Date(moveInDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const wallet = await getOrCreateWallet(req.user.id)
    if (Number(wallet.availableBalance) < amounts.required) {
      return res.status(400).json({ error: 'Insufficient available escrow balance.', requiredAmount: amounts.required, availableBalance: Number(wallet.availableBalance) })
    }

    const seeker = await getPrisma().user.findUnique({ where: { id: req.user.id } })
    const signedAt = new Date()
    const [hold] = await getPrisma().$transaction([
      getPrisma().transaction.create({ data: {
        walletId: wallet.id, type: 'Hold', status: 'Completed', amount: amounts.required, listingId,
        rentAmount: amounts.rentAmount || null, cautionFeeAmount: amounts.cautionFeeAmount || null,
        signatureName, signedAt, moveInDate, protectionEndsAt, initiatedBy: req.user.id,
        reason: amounts.kind === 'SALE' ? '25% property purchase commitment' : 'Initial rent plus caution fee',
      }}),
      getPrisma().wallet.update({ where: { id: wallet.id }, data: {
        availableBalance: { decrement: amounts.required }, heldBalance: { increment: amounts.required },
      }}),
    ])

    const title = amounts.kind === 'RENT' ? 'Residential Lease and Platform Facilitation Agreement' : 'Property Purchase Agreement'
    const residentialLeaseText = `RESIDENTIAL
LEASE AND PLATFORM FACILITATION AGREEMENT

This Master Tenancy and
Facilitation Agreement (the "Agreement") is entered into by and
between:

• The House Owner (“Landlord”): The verified
property owner or authorized property administrator listed on the SweetCasa
platform.

• The House Seeker (“Tenant”): The verified
individual seeking to lease and occupy the residential premises listed on the
SweetCasa platform.

• SweetCasa Technologies (“Platform / Facilitator”): The
digital platform providing property matching, secure transaction management,
and dispute facilitation services (within the 7 days period).

1. Grant of Tenancy
& Rental Terms

• 1.1 Lease Grant: The Landlord hereby agrees to
lease the designated property to the Tenant, and the Tenant agrees to occupy
the premises in accordance with the terms, conditions, and tenure options
(Short-Term or Long-Term Lease) selected within the SweetCasa mobile
application.

• 1.2 All-Inclusive Rental Fee: The total agreed
initial rental fee paid by the Tenant through the platform includes base rent
and pre-integrated property viewing and inspection fees. Neither the Landlord
nor any third-party agent shall demand, request, or accept cash payments,
hidden inspection fees, or off-platform commissions on-site. Any demand for
off-platform cash fees constitutes a direct breach of this Agreement.

2. Secure Payment
Vaulting & 7-Day Move-In Verification

• 2.1 Platform Payment Vaulting: The Tenant must
deposit 100% of the initial rental payment into the SweetCasa Secure Payment
System prior to key handover or taking physical possession of the property.

• 2.2 Verification Window: A mandatory 7-Day
Move-In Verification Window commences on the exact calendar date the tenant
physically moves-in (key handover). During this 7-day period, funds remain
securely held in the SweetCasa payment system to verify that the property
condition and advertised facilities(electricity, water-supply, etc) match the
verified app listing.

• 2.3 Standard Release Schedule (No Disputes):

• Day 8 Payout: If the Tenant occupies the
property past Day 7 without filing a formal dispute or amenity breach claim,
SweetCasa shall deduct its 5% platform commission and release the remaining 95%
of the total rent to the Landlord's designated financial account.

• 2.4 Voluntary Early Departure (Tenant Personal
Choice):

• If all advertised facilities are fully functional and
present, but the Tenant chooses to vacate the property within the 7-day window
purely due to personal preference, the payment shall be distributed as follows:

• Tenant: Receives a 94% refund of total funds
paid.

• Landlord: Receives 4% of the total payment as
reservation compensation for holding the property off the market.

• SweetCasa: Retains 2% for administrative and
platform transaction fees.

3. Listing Accuracy,
Amenity Misrepresentation & Specific Violation Rules

• 3.1 Duty of Listing Accuracy: The Landlord
guarantees that all facilities, utility connections, structural amenities, and
property features displayed on the SweetCasa app listing are fully functional
and physically present upon key handover.

• Example: If the listing explicitly advertises
running pipe-borne water, grid/backup electricity, secure perimeter fencing, or
specific bathroom fixtures, those exact items must be fully operational when
the Tenant takes possession.

• 3.2 Claim Filing & Proof Requirement: If the
Tenant moves in and discovers that an advertised amenity (such as running water
supply or electricity) is missing, non-functional, or misrepresented, the
Tenant must file a formal claim in the SweetCasa app(Report section) within the
7-Day Verification Window. The claim must be accompanied by tangible digital
evidence (e.g., clear video recordings of dry taps or broken fixtures,
photographic proof with time-stamps, or written corroboration).

• 3.3 Verified Remedy Options: Upon review and
verification of the submitted evidence by SweetCasa, the following legal
remedies apply:

• Option A: Tenant Elects to Remain (Partial Rent
Adjustment - 15% Rule)

• Example: If running water is absent but the
Tenant decides to stay in the property anyway.

• Tenant: Receives a 15% direct cash refund of the
total monthly rent as compensation for the missing amenity.

• Landlord: Receives 80% of the total monthly
rent.

• SweetCasa: Retains its standard 5% platform
commission.

• Option B: Tenant Elects to Vacate (Landlord
Misrepresentation Breach)

• Example: If the Tenant refuses to live in the
home due to the missing water supply and vacates within the 7-day window.

• Tenant: Entitled to a 96% full refund of total
funds paid.

• Landlord: Receives a reduced compensation of 2%
(penalized down from the standard 4%) for false advertising and failure to
deliver advertised property features.

• SweetCasa: Retains 2% to cover dispute
processing and administrative costs.

4. Caution Fee
(Security Deposit) & Disbursement Terms

• 4.1 Payment Collection & Direct Remittance: In
addition to the initial rental fee, the Tenant shall deposit a one-time
refundable Caution Fee (Security Deposit) into the SweetCasa Secure Payment
System prior to taking physical possession of the property. The Caution Fee is
collected simultaneously with the initial rental payment and shall be disbursed
directly to the Landlord alongside the rent payout (in accordance with Section
2.3). SweetCasa does not retain or hold the Caution Fee for the duration of the
tenancy.

• 4.2 Purpose of Caution Fee: The Caution Fee is
held by the Landlord solely as financial security against physical property
damage, broken fixtures (including sinks, water tanks, toilet units, taps, and
electrical fittings), unauthorized structural modifications, or unpaid tenant
utility arrears incurred during the tenancy. The Caution Fee shall not be
treated by the Tenant as advance rent.

• 4.3 Landlord Refund Obligation: Upon the
expiration, agreed termination, or voluntary departure from the tenancy, the
Landlord and Tenant shall conduct a joint physical inspection of the premises.
If the Tenant surrenders the property in its original, tenantable
condition—reasonable wear and tear excepted—with all fixtures intact and no
outstanding utility bills, the Landlord shall refund 100% of the Caution Fee
directly to the Tenant within seven (7) calendar days of move-out.

• 4.4 Itemized Deductions for Damage: If the
Landlord establishes actual physical damage or unfulfilled utility obligations
caused by Tenant misuse or negligence, the Landlord may deduct the reasonable,
actual cost of repairs or utility settlement from the Caution Fee. The Landlord
shall provide the Tenant with an itemized written breakdown of deductions along
with supporting repair receipts or utility bills, and must return any remaining
balance of the Caution Fee within seven (7) calendar days.

• 4.5 Document Priority & Evidentiary Reference: This
Agreement serves as the legal, binding record between the Landlord and Tenant regarding
the payment and receipt of the Caution Fee. In the event of an off-platform
dispute regarding unreturned deposits or unjustified deductions at tenancy end,
either party may submit this executed Agreement and transaction proof as
primary legal evidence before competent local authorities or courts under
Section 8.2.

5. Rights and
Obligations of Contracting Parties

• 5.1 Obligations of the Tenant:

• Pay recurring utility fees (such as electricity, water
bills, and sanitation rates) where specified in the individual listing terms.

• Maintain the interior premises in a clean, tenantable
condition, refraining from intentional structural modifications or physical
damage.

• Comply with local residential rules, avoiding illegal
activities, public nuisances, or unauthorized sub-leasing.

• Submit dispute claims with clear, verifiable evidence
within the mandatory 7-day period.

• 5.2 Obligations of the Landlord:

• Provide quiet, peaceful enjoyment and physical
possession of the property free from unannounced intrusions or unauthorized key
access.

• Ensure 100% accuracy of advertised amenities on the
SweetCasa listing before onboarding the property.

• Perform major structural maintenance and exterior
repairs (such as roof leaks or main plumbing pipes) not caused by tenant
misuse.

6. SweetCasa Platform
Role & Specific Limitations of Liability

Both Landlord and Tenant
explicitly acknowledge and agree that SweetCasa Technologies acts exclusively
as an intermediary technology matchmaker and financial escrow facilitator.
SweetCasa does not own, lease, manage, or inspect real estate directly. To
protect SweetCasa from legal liability:

• 6.1 Maintenance & Physical Repairs Exclusions: SweetCasa
is not responsible for physical property maintenance, plumbing breakdowns,
electrical grid failures, structural defects, or repairs before, during, or
after the tenancy period.

• 6.2 Personal Misconduct & Liability Exclusions: SweetCasa
is not liable for personal disputes between parties, noise complaints, physical
altercations, criminal activity, tenant property damage, stolen personal
belongings, or unpaid utility bills incurred by either party.

• 6.3 Voiding of Protection for Off-Platform
Transactions: Any side agreements, cash payments, deposit top-ups, or lease
modifications made outside the SweetCasa mobile application strictly void all
SweetCasa escrow protections, dispute resolution mechanisms, and liability
guarantees. SweetCasa bears zero legal liability for off-platform financial
losses.

• 6.4 Insurance Notice: SweetCasa does not act as
an insurance carrier. Both Landlord and Tenant are encouraged to secure
independent personal property and home insurance policies.

7. Communication
Consent & Feature Updates

• 7.1 Authorization for Direct Contact: By
accepting this Agreement, both the Landlord and Tenant explicitly grant consent
to be contacted by SweetCasa Technologies via in-app notification, SMS, phone
call, or email.

• 7.2 Permitted Communication Scope: Contact may
occur for:

1.        
Transaction updates, payment receipts, move-in
verification alerts, and dispute resolution proceedings.

2.        
Urgent platform updates, security alerts, and changes
to Terms of Service.

3.        
Tailored recommendations for new SweetCasa platform
features, including post-settlement vendor services (such as verified local
home technicians, plumbers, painters, movers, and living tools) designed to
enhance their housing and living experience.

8. Dispute Resolution
& Governing Jurisdiction

• 8.1 Platform Binding Mediation: Any conflict
arising within the 7-Day Move-In Verification Window concerning property
condition, held payments, or listing accuracy shall be submitted to SweetCasa's
administrative dispute panel. Both parties agree that SweetCasa's decision
regarding the disbursement, refund, or partial deduction of held escrow
funds—based on submitted digital proof—shall be final and binding regarding the
held funds.

• 8.2 Governing Law & Specific Jurisdiction: This
Agreement, its interpretation, and any legal actions arising from or related to
it shall be governed by, construed, and enforced in accordance with the civil,
commercial, and tenancy laws of the Republic of Cameroon. Any formal legal
proceedings outside platform mediation shall fall under the exclusive
territorial jurisdiction of the competent courts of Cameroon (including the
High Court / Court of First Instance of the applicable regional jurisdiction,
such as Bamenda, Mezam Division, Northwest Region, or Yaoundé, Centre Region).

9. Digital Signature
& Binding Execution

This Agreement is executed
digitally and becomes legally binding upon all parties once:

1.        
The Landlord confirms the property reservation and
accepts terms within the SweetCasa app.

2.        
The Tenant completes the payment authorization and
accepts terms within the SweetCasa app.

3.        
SweetCasa Technologies processes and validates the
digital booking authorization.`
    const propertyLocation = [listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', ')
    const transactionSummary = `<div class="box"><b>Property:</b> ${escapeHtml(listing.title)}<br>${propertyLocation ? `<b>Property location:</b> ${escapeHtml(propertyLocation)}<br>` : ''}<b>Seeker/Tenant:</b> ${escapeHtml(seeker?.name || seeker?.email)}<br><b>Landlord:</b> ${escapeHtml(listing.owner?.name || listing.owner?.email)}<br><b>Payment type:</b> ${escapeHtml(listing.paymentFrequency || (amounts.kind === 'SALE' ? 'For Sale' : 'Rental'))}<br><b>Protected amount / total locked:</b> ${amounts.required.toLocaleString()} XAF<br>${amounts.kind === 'RENT' ? `<b>Initial rent:</b> ${amounts.rentAmount.toLocaleString()} XAF<br><b>Caution fee:</b> ${amounts.cautionFeeAmount.toLocaleString()} XAF<br><b>Move-in / key-handover date:</b> ${moveInDate.toISOString().slice(0,10)}<br><b>Day 8 standard release date:</b> ${protectionEndsAt.toISOString().slice(0,10)}<br><b>Standard platform commission:</b> 5% of rent only<br>` : `<b>Purchase commitment:</b> 25% of listed sale price<br>`}</div>`
    const agreementBody = amounts.kind === 'RENT'
      ? `<pre class="terms">${escapeHtml(residentialLeaseText)}</pre>`
      : `<p>This transaction records a 25% property purchase commitment. A separate property sale agreement is required for the final conveyance and is not replaced by the Residential Lease Agreement.</p>`
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
      @page{size:A4;margin:18mm 16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;max-width:820px;margin:0 auto;padding:34px 28px;color:#24183a;background:#fff;line-height:1.58;font-size:14px}.brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6d28d9;padding-bottom:18px;margin-bottom:26px}.brand-name{font-size:25px;font-weight:900;color:#6d28d9;letter-spacing:-.5px}.brand-sub{font-size:11px;color:#746b80;margin-top:3px;text-transform:uppercase;letter-spacing:1.2px}.doc-meta{text-align:right;font-size:11px;color:#746b80}h1{font-size:22px;line-height:1.25;color:#24183a;margin:0 0 20px;text-align:center;text-transform:uppercase;letter-spacing:.3px}.summary-title{font-size:12px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}.box{background:#f8f5ff;border:1px solid #e6dcff;border-left:4px solid #6d28d9;padding:16px 18px;border-radius:8px;margin-bottom:26px;line-height:1.75}.terms{font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;word-wrap:break-word;font-size:13px;line-height:1.65;color:#352b42;margin:0}.sig{margin-top:34px;padding:20px;border:1px solid #ded8e8;border-radius:10px;background:#fcfbfe;page-break-inside:avoid}.sig-title{font-size:12px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}.signature-name{font-family:Georgia,serif;font-size:22px;font-style:italic;color:#24183a;margin:8px 0 14px;padding-bottom:8px;border-bottom:1px solid #bfb5cc}.authorization{margin-top:12px;padding:10px 12px;background:#f3effb;border-radius:6px;font-size:12px;color:#51465f}.footer{margin-top:30px;padding-top:14px;border-top:1px solid #e4deea;text-align:center;color:#81778b;font-size:10px}@media print{body{padding:0}.brand{margin-top:0}.box,.sig{break-inside:avoid}}
      </style></head><body><div class="brand"><div><div class="brand-name">SweetCasa</div><div class="brand-sub">Secure Property Transaction</div></div><div class="doc-meta">Executed Agreement<br>Transaction E${hold.id}<br>${signedAt.toISOString().slice(0,10)}</div></div>
      <h1>${title}</h1><div class="summary-title">Property &amp; Transaction Summary</div>${transactionSummary}${agreementBody}
      <div class="sig"><div class="sig-title">Electronic Execution</div><div>Tenant electronic signature</div><div class="signature-name">${escapeHtml(signatureName)}</div><b>Signed:</b> ${signedAt.toISOString()}<br><b>Transaction ID:</b> E${hold.id}<div class="authorization"><b>Payment authorization:</b> Required funds, including the applicable caution fee, were moved from available balance to SweetCasa held balance after execution of this agreement.</div></div><div class="footer">SweetCasa Technologies · Digitally executed transaction record · Keep this document with your transaction proof.</div></body></html>`
    let document = null
    try {
      const uploaded = await uploadAgreementHtml(html, `agreement-${hold.id}-${Date.now()}.html`)
      document = await getPrisma().document.create({ data: {
        listingId, userId: req.user.id, transactionId: hold.id, type: 'SIGNED_AGREEMENT',
        fileName: `${title} - ${listing.title}.html`, url: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id, status: 'Verified', reviewedAt: signedAt,
      }})
    } catch (docErr) {
      console.error('Agreement upload error:', docErr)
      // Do not leave the seeker financially locked into a transaction whose executed
      // agreement could not be archived for the parties/Admin/Staff. Roll back the hold.
      await getPrisma().$transaction([
        getPrisma().transaction.delete({ where: { id: hold.id } }),
        getPrisma().wallet.update({ where: { id: wallet.id }, data: {
          availableBalance: { increment: amounts.required }, heldBalance: { decrement: amounts.required },
        }}),
      ])
      return res.status(502).json({ error: 'The agreement could not be archived. No funds were held. Please try again.' })
    }

    res.status(201).json({ transaction: serializeTransaction(hold), agreement: { id: document.id, url: document.url, fileName: document.fileName }, requiredAmount: amounts.required })
  } catch (err) {
    console.error('Purchase error:', err)
    res.status(500).json({ error: err.message || 'Failed to create protected purchase.' })
  }
}

function settlementForHold(hold) {
  const gross = Number(hold.amount || 0)
  const rent = Number(hold.rentAmount || 0)
  const caution = Number(hold.cautionFeeAmount || 0)
  // Rental agreement Section 2.3: 5% commission applies to rent only.
  // Section 4.1: the full caution fee is remitted alongside the rent payout.
  if (rent > 0) {
    const platformCommission = Math.round(rent * 0.05)
    const landlordPayout = (rent - platformCommission) + caution
    return { gross, rent, caution, platformCommission, landlordPayout }
  }
  // Sale holds are not governed by the Residential Lease Agreement.
  return { gross, rent: 0, caution: 0, platformCommission: 0, landlordPayout: gross }
}

async function releaseMaturedHolds() {
  const prisma = getPrisma()
  const matured = await prisma.transaction.findMany({
    where: { type: 'Hold', status: 'Completed', protectionEndsAt: { lte: new Date() } }, include: { listing: true }, take: 100,
  })
  for (const hold of matured) {
    if (!hold.listing?.ownerId) continue
    const already = await prisma.transaction.findFirst({ where: { relatedTransactionId: hold.id, type: { in: ['Release','Refund'] } } })
    if (already) continue
    // A formal claim filed against this held transaction pauses automatic Day 8 payout
    // until Admin/Staff resolves the claim and explicitly releases/refunds the hold.
    const openClaim = await prisma.report.findFirst({
      where: { transactionId: hold.id, status: { in: ['Pending', 'Reviewed'] } },
      select: { id: true },
    })
    if (openClaim) continue
    const ownerWallet = await getOrCreateWallet(hold.listing.ownerId)
    const settlement = settlementForHold(hold)
    try {
      await prisma.$transaction([
        prisma.transaction.create({ data: { walletId: ownerWallet.id, type: 'Release', status: 'Completed', amount: settlement.landlordPayout, listingId: hold.listingId, relatedTransactionId: hold.id, resolutionKey: `hold-${hold.id}`, reason: 'Day 8 release after 7-day SweetCasa move-in verification window', rentAmount: hold.rentAmount, cautionFeeAmount: hold.cautionFeeAmount, platformCommissionAmount: settlement.platformCommission, landlordPayoutAmount: settlement.landlordPayout } }),
        prisma.wallet.update({ where: { id: hold.walletId }, data: { heldBalance: { decrement: settlement.gross } } }),
        prisma.wallet.update({ where: { id: ownerWallet.id }, data: { availableBalance: { increment: settlement.landlordPayout } } }),
      ])
    } catch (e) { console.error(`Auto-release failed for hold ${hold.id}:`, e.message) }
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
    if (hold.protectionEndsAt && new Date(hold.protectionEndsAt) > new Date()) {
      return res.status(400).json({ error: 'Funds cannot be released before the 7-day SweetCasa protection period ends.' })
    }
    const alreadyMoved = await getPrisma().transaction.findFirst({
      where: { relatedTransactionId: hold.id, type: { in: ['Release', 'Refund'] } },
    })
    if (alreadyMoved) return res.status(409).json({ error: `This hold was already ${alreadyMoved.type.toLowerCase()}d.` })

    if (!hold.listing?.ownerId) return res.status(400).json({ error: 'This listing has no owner to release funds to.' })

    const ownerWallet = await getOrCreateWallet(hold.listing.ownerId)
    const settlement = settlementForHold(hold)

    const [release] = await getPrisma().$transaction([
      getPrisma().transaction.create({
        data: {
          walletId: ownerWallet.id,
          type: 'Release',
          status: 'Completed',
          amount: settlement.landlordPayout,
          listingId: hold.listingId,
          relatedTransactionId: hold.id,
          resolutionKey: `hold-${hold.id}`,
          initiatedBy: req.user.id,
          reason: req.body?.note ? String(req.body.note).trim() : null,
          rentAmount: hold.rentAmount,
          cautionFeeAmount: hold.cautionFeeAmount,
          platformCommissionAmount: settlement.platformCommission,
          landlordPayoutAmount: settlement.landlordPayout,
        },
      }),
      getPrisma().wallet.update({ where: { id: hold.walletId }, data: { heldBalance: { decrement: settlement.gross } } }),
      getPrisma().wallet.update({ where: { id: ownerWallet.id }, data: { availableBalance: { increment: settlement.landlordPayout } } }),
    ])

    await logAction({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ESCROW_RELEASED',
      entityType: 'Transaction',
      entityId: hold.id,
      entityLabel: hold.listing?.title,
      metadata: { grossHeld: settlement.gross, rent: settlement.rent, cautionFee: settlement.caution, platformCommission: settlement.platformCommission, landlordPayout: settlement.landlordPayout, note: req.body?.note },
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
    const hold = await getPrisma().transaction.findUnique({ where: { id }, include: { listing: true, wallet: true } })
    if (!hold || hold.type !== 'Hold' || hold.status !== 'Completed') return res.status(400).json({ error: 'Only a completed Hold can be refunded.' })
    const alreadyMoved = await getPrisma().transaction.findFirst({ where: { relatedTransactionId: hold.id, type: { in: ['Release','Refund'] } } })
    if (alreadyMoved) return res.status(409).json({ error: `This hold was already ${alreadyMoved.type.toLowerCase()}d.` })
    const amount = Number(hold.amount)
    const [refund] = await getPrisma().$transaction([
      getPrisma().transaction.create({ data: { walletId: hold.walletId, type: 'Refund', status: 'Completed', amount, listingId: hold.listingId, relatedTransactionId: hold.id, resolutionKey: `hold-${hold.id}`, initiatedBy: req.user.id, reason: req.body?.note ? String(req.body.note).trim() : 'Returned to seeker available escrow balance', rentAmount: hold.rentAmount, cautionFeeAmount: hold.cautionFeeAmount } }),
      getPrisma().wallet.update({ where: { id: hold.walletId }, data: { heldBalance: { decrement: amount }, availableBalance: { increment: amount } } }),
    ])
    await logAction({ actorId: req.user.id, actorRole: req.user.role, action: 'ESCROW_REFUNDED', entityType: 'Transaction', entityId: hold.id, entityLabel: hold.listing?.title, metadata: { amount, destination: 'SEEKER_AVAILABLE_WALLET' } })
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