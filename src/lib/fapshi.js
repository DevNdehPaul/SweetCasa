// Fapshi (https://fapshi.com) — Cameroon mobile money payment gateway (MTN MoMo / Orange Money).
//
// IMPORTANT: Fapshi services are one-directional — a service enabled for payouts can no
// longer collect payments, and vice versa (per their docs: "After enabling payouts for a
// service, that service can no longer collect payments. Use separate services for
// collections and payouts."). So this file talks to TWO separate Fapshi services with
// TWO separate credential pairs:
//   - "collection" service → /initiate-pay, /payment-status  (deposits coming in)
//   - "payout" service     → /payout                          (refunds + withdrawals going out)
//
// Also note: payouts are disabled by default in Fapshi's live environment. You must test
// in sandbox first, then email support@fapshi.com with your LIVE payout service's API
// USER (not the key) and ask them to enable payouts on it.

const BASE_URLS = {
  sandbox: 'https://sandbox.fapshi.com',
  live: 'https://live.fapshi.com',
}

function baseUrl() {
  return BASE_URLS[process.env.FAPSHI_ENV === 'live' ? 'live' : 'sandbox']
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

// ── POST /initiate-pay — deposit: seeker is redirected to a Fapshi-hosted checkout ──
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
// Returns { transId, status, amount, revenue, financialTransId, dateInitiated, dateConfirmed, ... }
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

module.exports = { initiatePay, getPaymentStatus, payout, baseUrl }
