const Groq = require('groq-sdk')
const { getPrisma } = require('./prisma')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const BUDGET_MAP = {
  u50k: { min: 0, max: 50_000 },
  '50_150': { min: 50_000, max: 150_000 },
  '150_500': { min: 150_000, max: 500_000 },
  '500_1m': { min: 500_000, max: 1_000_000 },
  above1m: { min: 1_000_000, max: 999_999_999 },
}

const TYPE_ALIASES = {
  house: ['house', 'maison', 'bungalow', 'maison basse', 'duplex', 'villa'],
  maison: ['house', 'maison', 'bungalow', 'maison basse', 'duplex', 'villa'],
  apartment: ['apartment', 'appartement', 'flat'],
  appartement: ['apartment', 'appartement', 'flat'],
  studio: ['studio'],
  villa: ['villa', 'house', 'maison'],
  duplex: ['duplex', 'house', 'maison'],
  room: ['room', 'chambre', 'single room'],
  chambre: ['room', 'chambre', 'single room'],
  office: ['office', 'bureau'],
  bureau: ['office', 'bureau'],
  hotel: ['hotel', 'hôtel'],
  'guest house': ['guest house', 'guesthouse'],
}

function text(v) { return String(v ?? '').trim().toLowerCase() }
function number(v, fallback = null) {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : fallback
}
function facilitiesOf(p) {
  if (Array.isArray(p.facilities)) return p.facilities.map(String)
  if (!p.facilities) return []
  try { const parsed = JSON.parse(p.facilities); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
}
function budgetRange(criteria = {}) {
  if (criteria.minPrice != null || criteria.maxPrice != null) {
    return { min: number(criteria.minPrice, 0), max: number(criteria.maxPrice, 999_999_999) }
  }
  if (criteria.maxBudget != null || criteria.budgetAmount != null) {
    const max = number(criteria.maxBudget ?? criteria.budgetAmount, 999_999_999)
    return { min: 0, max }
  }
  return BUDGET_MAP[criteria.budget] || { min: 0, max: 999_999_999 }
}
function typeMatches(actual, requested) {
  if (!requested) return true
  const a = text(actual); const r = text(requested)
  const aliases = TYPE_ALIASES[r] || [r]
  return aliases.some(x => a.includes(x) || x.includes(a))
}
function locationMatches(p, requested) {
  if (!requested) return true
  const q = text(requested)
  return [p.city, p.neighborhood, p.region].some(v => {
    const x = text(v)
    return x && (x.includes(q) || q.includes(x))
  })
}
function isRent(p) {
  const f = text(p.paymentFrequency)
  return f && !f.includes('sale') && !f.includes('vente')
}
function purposeMatches(p, purpose) {
  if (!purpose) return true
  const q = text(purpose)
  if (q.includes('rent') || q.includes('lou')) return isRent(p)
  if (q.includes('buy') || q.includes('sale') || q.includes('achat') || q.includes('achet')) return !isRent(p)
  return true
}
function roomScore(actual, requested) {
  const req = number(requested, null)
  if (req == null || req <= 0) return 0
  const a = number(actual, 0)
  if (a >= req) return 4
  return Math.max(-6, -6 * (req - a))
}
function priceFit(price, range) {
  const p = number(price, 0)
  if (p >= range.min && p <= range.max) return { score: 22, exact: true }
  const nearest = p < range.min ? range.min : range.max
  if (!nearest || nearest >= 999_999_999) return { score: 0, exact: true }
  const distance = Math.abs(p - nearest) / Math.max(nearest, 1)
  if (distance <= 0.15) return { score: 12, exact: false }
  if (distance <= 0.35) return { score: 5, exact: false }
  return { score: -8, exact: false }
}
function scoreListing(p, criteria) {
  const range = budgetRange(criteria)
  const requestedLocation = criteria.neighborhood || criteria.location || criteria.city || criteria.region
  const locExact = locationMatches(p, requestedLocation)
  const typeExact = typeMatches(p.type, criteria.propertyType)
  const purposeExact = purposeMatches(p, criteria.purpose)
  const pf = priceFit(p.price, range)
  let score = 30
  score += locExact ? 24 : (requestedLocation ? -8 : 0)
  score += typeExact ? 18 : (criteria.propertyType ? -5 : 0)
  score += purposeExact ? 8 : (criteria.purpose ? -8 : 0)
  score += pf.score
  score += roomScore(p.bedrooms, criteria.bedrooms)
  score += roomScore(p.bathrooms, criteria.bathrooms)
  score += roomScore(p.toilets, criteria.toilets)
  score += roomScore(p.kitchens, criteria.kitchens)
  score += roomScore(p.parlors, criteria.parlors)

  const have = facilitiesOf(p).map(text)
  const wanted = (criteria.facilities || []).map(text).filter(Boolean)
  if (wanted.length) {
    const matched = wanted.filter(w => have.some(h => h.includes(w) || w.includes(h))).length
    score += Math.round((matched / wanted.length) * 10)
  }
  const dealBreakers = (criteria.dealBreakers || []).map(text).filter(Boolean)
  const searchable = text([p.title, p.description, p.type, p.city, p.neighborhood, ...have].join(' '))
  if (dealBreakers.some(d => searchable.includes(d))) score -= 20

  return {
    score: Math.max(0, Math.min(100, score)),
    exact: locExact && typeExact && purposeExact && pf.exact,
  }
}
function resultFrom(p, rank, reason, badge) {
  const img = p.images?.[0]?.imageUrl ?? null
  const rent = isRent(p)
  return {
    id: String(p.id),
    score: Math.max(0, Math.min(100, Math.round(rank.score))),
    matchReason: reason || (rank.exact ? 'Strong match for your search criteria.' : 'A close available option worth considering.'),
    badge: badge ?? (rank.exact ? 'Best Match' : 'Close Match'),
    name: p.title,
    location: [p.neighborhood, p.city, p.region].filter(Boolean).join(', '),
    price: `XAF ${Number(p.price).toLocaleString()}${rent ? `/${text(p.paymentFrequency).includes('year') ? 'yr' : 'mo'}` : ''}`,
    tags: [p.type, `${p.bedrooms}bd`, `${p.bathrooms}ba`].filter(Boolean),
    images: img ? [img] : [],
    imageUrl: img,
    listingType: rent ? 'rent' : 'sale',
    matchType: rank.exact ? 'exact' : 'close',
  }
}

async function searchAndRankListings(criteria = {}, options = {}) {
  const prisma = getPrisma()
  // Database is the source of truth. Fetch eligible inventory broadly first;
  // never let an exact city/type/budget string hide real listings from CasaMatch.
  let inventory = await prisma.listing.findMany({
    where: {
      status: { equals: 'Approved', mode: 'insensitive' },
      state: { equals: 'Available', mode: 'insensitive' },
    },
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { imageUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })

  // Compatibility for older rows/databases where state was not maintained yet.
  if (!inventory.length) {
    inventory = await prisma.listing.findMany({
      where: { status: { equals: 'Approved', mode: 'insensitive' } },
      include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 150,
    })
  }

  if (!inventory.length) return { results: [], matchMode: 'none', inventoryCount: 0 }

  const scored = inventory
    .map(p => ({ p, rank: scoreListing(p, criteria) }))
    .sort((a, b) => b.rank.score - a.rank.score || Number(b.p.id) - Number(a.p.id))

  const exact = scored.filter(x => x.rank.exact)
  const pool = (exact.length ? exact : scored).slice(0, 30)
  const matchMode = exact.length ? 'exact' : 'close'

  let aiRanking = []
  if (process.env.GROQ_API_KEY && pool.length) {
    try {
      const compact = pool.map((x, i) => {
        const p = x.p
        return `[${i}] id=${p.id} | ${p.title} | type=${p.type} | XAF ${Number(p.price)} | ${p.neighborhood || ''}, ${p.city}, ${p.region} | ${p.bedrooms}bd ${p.bathrooms}ba | payment=${p.paymentFrequency || ''} | facilities=${facilitiesOf(p).slice(0, 8).join(', ')} | baseScore=${x.rank.score}`
      }).join('\n')
      const response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b', max_tokens: 1200, temperature: 0.15,
        messages: [
          { role: 'system', content: `You rank REAL SweetCasa database listings. Never invent a property or index. Return only JSON array with up to 5 objects: {"index":0,"score":90,"matchReason":"...","badge":"Best Match"}. Respect the supplied deterministic baseScore, but use description/facilities to break ties. If results are close rather than exact, say so in matchReason. badge may be Best Match, Great Value, Close Match, or null.` },
          { role: 'user', content: `SEARCH CRITERIA:\n${JSON.stringify(criteria)}\n\nMATCH MODE: ${matchMode}\n\nDATABASE CANDIDATES:\n${compact}` },
        ],
      })
      const raw = (response.choices[0]?.message?.content || '[]').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) aiRanking = parsed
    } catch (err) {
      console.error('[CasaMatch] AI ranking fallback:', err.message)
    }
  }

  const used = new Set()
  const results = []
  for (const r of aiRanking) {
    const idx = Number(r.index)
    if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length || used.has(idx)) continue
    used.add(idx)
    const item = pool[idx]
    const blended = { ...item.rank, score: Math.round(item.rank.score * 0.7 + Math.max(0, Math.min(100, number(r.score, item.rank.score))) * 0.3) }
    results.push(resultFrom(item.p, blended, r.matchReason, r.badge))
    if (results.length === 5) break
  }
  for (let i = 0; results.length < 5 && i < pool.length; i++) {
    if (used.has(i)) continue
    const item = pool[i]
    results.push(resultFrom(item.p, item.rank, null, null))
  }

  return { results, matchMode, inventoryCount: inventory.length, exactCount: exact.length }
}

module.exports = { BUDGET_MAP, searchAndRankListings }
