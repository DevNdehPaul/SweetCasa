const express  = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const router   = express.Router();
const db       = require('../../prisma.config'); // your DB client (Mongoose, Prisma, etc.)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/casa-match', async (req, res) => {
  try {
    const { quiz } = req.body;

    // ── 1. Map budget id → numeric range for DB query ──────────────────────
    const budgetMap = {
      u50k:    { min: 0,       max: 50000   },
      '50_150':  { min: 50000,   max: 150000  },
      '150_500': { min: 150000,  max: 500000  },
      '500_1m':  { min: 500000,  max: 1000000 },
      above1m:   { min: 1000000, max: 999999999 },
    };
    const budget = budgetMap[quiz.budget] ?? { min: 0, max: 999999999 };

    // ── 2. Pre-filter in DB (hard filters only) ────────────────────────────
    //    Adjust field names to match your actual DB schema
    const properties = await db.collection('properties').find({
      city:         quiz.city,
      type:         quiz.propertyType,
      listingType:  quiz.purpose === 'renting' ? 'rent' : 'sale',
      price:        { $gte: budget.min, $lte: budget.max },
      isVerified:   true,
    })
    .limit(30)   // give Claude a manageable pool
    .lean();

    if (!properties.length) {
      return res.json({ results: [], message: 'no_listings_found' });
    }

    // ── 3. Build Claude prompt ─────────────────────────────────────────────
    const userPrefsBlock = `
USER PREFERENCES:
- Budget range: ${quiz.budget}
- City: ${quiz.city}
- Property type: ${quiz.propertyType}
- Purpose: ${quiz.purpose}
- Bedrooms: ${quiz.bedrooms}, Bathrooms: ${quiz.bathrooms},
  Toilets: ${quiz.toilets}, Kitchens: ${quiz.kitchens}, Parlors: ${quiz.parlors}
- Must-have facilities: ${quiz.facilities.join(', ') || 'none specified'}
- Personal description: "${quiz.description}"
- Deal-breakers: ${quiz.dealBreakers.join(', ') || 'none'}
`.trim();

    const listingsBlock = properties.map((p, i) =>
      `[${i}] id=${p._id} | "${p.title}" | ${p.bedrooms}bd ${p.bathrooms}ba | ` +
      `XAF ${p.price}/mo | facilities: ${(p.facilities || []).join(', ')} | ` +
      `floor: ${p.floor ?? 'ground'} | desc: ${p.description?.slice(0, 120)}`
    ).join('\n');

    // ── 4. Call Claude ─────────────────────────────────────────────────────
    const aiResponse = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `
You are CasaMatch AI, a real estate matching engine for Cameroon.
You receive a user's housing preferences and a list of available properties.
Your job: rank the TOP 5 best matches and explain WHY each one fits.

Rules:
- Penalise any property that has a deal-breaker (e.g. ground floor if user selected ground_floor).
- Reward exact facility matches heavily.
- Score from 0–100 based on overall fit.
- ALWAYS respond with ONLY valid JSON — no markdown, no extra text.

Response schema (array of up to 5 objects):
[
  {
    "index": <number — the [N] index from the listings>,
    "score": <0-100>,
    "matchReason": "<one sentence why this is a great fit, max 120 chars>"
  }
]
      `.trim(),
      messages: [{
        role:    'user',
        content: `${userPrefsBlock}\n\nAVAILABLE LISTINGS:\n${listingsBlock}`,
      }],
    });

    // ── 5. Parse Claude's ranking ──────────────────────────────────────────
    const raw     = aiResponse.content[0].text.trim();
    const ranking = JSON.parse(raw); // [{index, score, matchReason}]

    // ── 6. Build final result array ────────────────────────────────────────
    const results = ranking.map(r => {
      const prop = properties[r.index];
      return {
        id:          String(prop._id),
        score:       r.score,
        matchReason: r.matchReason,
        name:        prop.title,
        location:    `${prop.neighbourhood ?? ''}, ${prop.city}`.trim(),
        price:       `${(prop.price / 1000).toFixed(0)}k XAF/mo`,
        tags:        (prop.facilities ?? []).slice(0, 4),
        badge:       r.score >= 90 ? 'Best Match' : null,
        images:      prop.images ?? [],
      };
    });

    res.json({ results });

  } catch (err) {
    console.error('CasaMatch AI error:', err);
    res.status(500).json({ error: 'matching_failed' });
  }
});

module.exports = router;