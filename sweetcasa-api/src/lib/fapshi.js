// Fapshi (https://fapshi.com) — Cameroon mobile money payment gateway (MTN MoMo / Orange Money).
//
// IMPORTANT: Fapshi services are one-directional — a service enabled for payouts can no
// longer collect payments, and vice versa (per their docs: "After enabling payouts for a
// service, that service can no longer collect payments. Use separate services for
// collections and payouts."). So this file talks to TWO separate Fapshi services with
// TWO separate credential pairs:
//   - "collection" service → /direct-pay, /initiate-pay, /payment-status  (deposits coming in)
//   - "payout" service     → /payout                                      (refunds + withdrawals going out)
//
// Also note: payouts are disabled by default in Fapshi's live environment. You must test
// in sandbox first, then email support@fapshi.com with your LIVE payout service's API
// USER (not the key) and ask them to enable payouts on it.

const BASE_URLS = {
  sandbox: 'https://sandbox.fapshi.com',
  live: 'https://live.fapshi.com',
}

function baseUrl() {
  // Defaults to LIVE. Set FAPSHI_ENV=sandbox explicitly to test against sandbox instead —
  // sandbox uses a separate set of API credentials from live, so both env vars and
  // credentials need to change together when switching.
  return BASE_URLS[process.env.FAPSHI_ENV === 'sandbox' ? 'sandbox' : 'live']
}

function collectionHeaders() {
  if (!process.env.FAPSHI_COLLECTION_API_USER || !process.env.FAPSHI_COLLECTION_API_KEY) {
    throw new Error('Fapshi collection credentials are not configured (FAPSHI_COLLECTION_API_USER/KEY).')
  }
  return {
    'Content-Type': 'application/json',
    apiuser: process.env.FAPSHI_COLLECTION_API_USER,
    apikey: process.env.FAPSHI_COLLECTION_API_KEY,
  }
}

function payoutHeaders() {
  if (!process.env.FAPSHI_PAYOUT_API_USER || !process.env.FAPSHI_PAYOUT_API_KEY) {
    throw new Error('Fapshi payout credentials are not configured (FAPSHI_PAYOUT_API_USER/KEY).')
  }
  return {
    'Content-Type': 'application/json',
    apiuser: process.env.FAPSHI_PAYOUT_API_USER,
    apikey: process.env.FAPSHI_PAYOUT_API_KEY,
  }
}

async function parseOrThrow(res, label) {
  let data = {}
  try {
    data = await res.json()
  } catch {
    // non-JSON error body — fall through with empty data
  }
  if (!res.ok) {
    throw new Error(data?.message || `Fapshi ${label} failed (HTTP ${res.status})`)
  }
  return data
}

// ── POST /direct-pay — deposit: charge the seeker's own MTN MoMo / Orange Money number ──
// directly, no redirect — Fapshi pushes a USSD/app prompt straight to their phone.
// medium must be 'mobile money' (MTN) or 'orange money'.
// Returns { message, transId, dateInitiated }
async function directPay({ amount, phone, medium, email, userId, externalId, message }) {
  if (!phone || !medium) {
    throw new Error('directPay requires both phone and medium (the payer has no checkout page to enter these on).')
  }
  const res = await fetch(`${baseUrl()}/direct-pay`, {
    method: 'POST',
    headers: collectionHeaders(),
    body: JSON.stringify({ amount, phone, medium, email, userId, externalId, message }),
  })
  return parseOrThrow(res, 'direct-pay')
}

// ── POST /initiate-pay — deposit (redirect flow): seeker is sent to a Fapshi-hosted ──
// checkout page instead of being charged directly. Kept for reference / fallback —
// the deposit flow now calls directPay above instead.
// Returns { message, link, transId, dateInitiated }
async function initiatePay({ amount, email, redirectUrl, userId, externalId, message }) {
  const res = await fetch(`${baseUrl()}/initiate-pay`, {
    method: 'POST',
    headers: collectionHeaders(),
    body: JSON.stringify({ amount, email, redirectUrl, userId, externalId, message }),
  })
  return parseOrThrow(res, 'initiate-pay')
}

// ── GET /payment-status/:transId — poll a deposit's current state ────────────────
// Works the same for both direct-pay and initiate-pay transactions.
// Returns { transId, status, medium, amount, revenue, financialTransId, dateInitiated, dateConfirmed, ... }
// status is one of: CREATED | PENDING | SUCCESSFUL | FAILED | EXPIRED
async function getPaymentStatus(transId) {
  const res = await fetch(`${baseUrl()}/payment-status/${encodeURIComponent(transId)}`, {
    headers: collectionHeaders(),
  })
  return parseOrThrow(res, 'payment-status')
}

// ── POST /payout — refund (to seeker) or withdrawal (to owner) ───────────────────
// Returns { message, transId, dateInitiated }
async function payout({ amount, phone, medium, name, email, userId, externalId, message }) {
  const res = await fetch(`${baseUrl()}/payout`, {
    method: 'POST',
    headers: payoutHeaders(),
    body: JSON.stringify({ amount, phone, medium, name, email, userId, externalId, message }),
  })
  return parseOrThrow(res, 'payout')
}

module.exports = { directPay, initiatePay, getPaymentStatus, payout, baseUrl }
