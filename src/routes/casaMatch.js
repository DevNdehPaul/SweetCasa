const express = require('express');
const Groq    = require('groq-sdk');
const router  = express.Router();
const { getPrisma } = require('../lib/prisma');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/casa-match
router.post('/', async (req, res) => {
  try {
    const { quiz } = req.body;
    if (!quiz) return res.status(400).json({ error: 'quiz payload required' });

    const prisma = getPrisma();

    // ── 1. Map budget id → numeric range ────────────────────────────────────
    const budgetMap = {
      u50k:      { min: 0,       max: 50000      },
      '50_150':  { min: 50000,   max: 150000     },
      '150_500': { min: 150000,  max: 500000     },
      '500_1m':  { min: 500000,  max: 1000000    },
      above1m:   { min: 1000000, max: 999999999  },
    };
    const budget = budgetMap[quiz.budget] ?? { min: 0, max: 999999999 };

    // ── 2. Prisma pre-filter (hard constraints only) ─────────────────────────
    const where = {
      status: 'Approved',
      price:  { gte: budget.min, lte: budget.max },
    };

    if (quiz.city) {
      where.city = { equals: quiz.city, mode: 'insensitive' };
    }

    if (quiz.propertyType) {
      where.type = { equals: quiz.propertyType, mode: 'insensitive' };
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        images: {
          where: { isPrimary: true },
          take:  1,
          select: { imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (!listings.length) {
      return res.json({ results: [], message: 'no_listings_found' });
    }

    // ── 3. Build prompt ──────────────────────────────────────────────────────
    const userPrefsBlock = `
USER PREFERENCES:
- Budget range: ${quiz.budget}
- City: ${quiz.city ?? 'any'}
- Property type: ${quiz.propertyType ?? 'any'}
- Purpose: ${quiz.purpose ?? 'any'}
- Bedrooms: ${quiz.bedrooms}, Bathrooms: ${quiz.bathrooms},
  Toilets: ${quiz.toilets}, Kitchens: ${quiz.kitchens}, Parlors: ${quiz.parlors}
- Must-have facilities: ${(quiz.facilities ?? []).join(', ') || 'none specified'}
- Personal description: "${quiz.description ?? ''}"
- Deal-breakers: ${(quiz.dealBreakers ?? []).join(', ') || 'none'}
`.trim();

    const listingsBlock = listings.map((p, i) => {
      const facilities = Array.isArray(p.facilities)
        ? p.facilities
        : (p.facilities
            ? (() => { try { return JSON.parse(p.facilities); } catch { return []; } })()
            : []);
      return (
        `[${i}] id=${p.id} | "${p.title}" | ` +
        `${p.bedrooms}bd ${p.bathrooms}ba ${p.toilets}wc ${p.parlors}pr | ` +
        `XAF ${Number(p.price).toLocaleString()} | ` +
        `city: ${p.city} | neighborhood: ${p.neighborhood ?? 'N/A'} | ` +
        `payment: ${p.paymentFrequency ?? 'N/A'} | ` +
        `facilities: ${facilities.slice(0, 6).join(', ') || 'N/A'} | ` +
        `desc: ${(p.description ?? '').slice(0, 120)}`
      );
    }).join('\n');

    // ── 4. Call Groq ─────────────────────────────────────────────────────────
    const chatResponse = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',   // free, fast, very capable
      max_tokens:  1500,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `
You are CasaMatch AI, a real estate matching engine for Cameroon.
You receive a user's housing preferences and a list of available properties.
Your job: rank the TOP 5 best matches and explain WHY each one fits.

Rules:
- Penalise any property that has a deal-breaker the user listed.
- Reward properties that match the required facilities.
- Score from 0–100 based on overall fit.
- Consider bedroom/bathroom counts, location, price and description.
- ALWAYS respond with ONLY valid JSON — no markdown, no extra text, no code fences.

Response schema (array of up to 5 objects):
[
  {
    "index": <number — the [N] index from the listings>,
    "score": <0-100>,
    "matchReason": "<one sentence why this is a great fit, max 120 chars>"
  }
]
          `.trim(),
        },
        {
          role:    'user',
          content: `${userPrefsBlock}\n\nAVAILABLE LISTINGS:\n${listingsBlock}`,
        },
      ],
    });

    // ── 5. Parse Groq's ranking ──────────────────────────────────────────────
    let raw = chatResponse.choices[0]?.message?.content?.trim() ?? '[]';

    // Strip markdown code fences if added despite instructions
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    let ranking;
    try {
      ranking = JSON.parse(raw);
    } catch {
      console.error('Groq returned invalid JSON:', raw);
      return res.status(500).json({ error: 'matching_failed' });
    }

    if (!Array.isArray(ranking)) {
      return res.status(500).json({ error: 'matching_failed' });
    }

    // ── 6. Build final result array ──────────────────────────────────────────
    const results = ranking
      .filter(r => r.index >= 0 && r.index < listings.length)
      .map(r => {
        const prop = listings[r.index];
        const facilities = Array.isArray(prop.facilities)
          ? prop.facilities
          : (prop.facilities
              ? (() => { try { return JSON.parse(prop.facilities); } catch { return []; } })()
              : []);

        const freq = (prop.paymentFrequency ?? '').toLowerCase();
        const listingType = ['monthly', 'weekly', 'daily', 'per month', 'per week']
          .some(k => freq.includes(k)) ? 'rent' : 'sale';

        return {
          id:          String(prop.id),
          score:       Math.min(100, Math.max(0, Number(r.score) || 0)),
          matchReason: r.matchReason ?? '',
          name:        prop.title,
          location:    [prop.neighborhood, prop.city].filter(Boolean).join(', '),
          price:       `${Number(prop.price).toLocaleString()} XAF`,
          tags:        facilities.slice(0, 4),
          badge:       r.score >= 90 ? 'Best Match' : r.score >= 80 ? 'Great Fit' : null,
          imageUrl:    prop.images?.[0]?.imageUrl ?? null,
          listingType,
        };
      });

    res.json({ results });

  } catch (err) {
    console.error('CasaMatch AI error:', err);
    res.status(500).json({ error: 'matching_failed', detail: err.message });
  }
});

module.exports = router;