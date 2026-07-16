/**
 * CasaMatch Conversational AI Chat  —  /api/casamatch-chat
 *
 * Endpoints (all require Bearer JWT):
 *   GET    /conversations               — list user's past AI conversations
 *   POST   /conversations               — start a new conversation
 *   GET    /conversations/:id           — fetch conversation + messages
 *   POST   /conversations/:id/messages  — send a message (multipart: text + optional image/audio)
 *   DELETE /conversations/:id           — delete a conversation
 */

const express    = require('express')
const multer     = require('multer')
const streamifier = require('streamifier')
const Groq       = require('groq-sdk')
const FormData   = require('form-data')   // Node built-in via Groq SDK deps
const router     = express.Router()

const { getPrisma }                          = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const requireRole                            = require('../middleware/requireRole')

// ─── Groq client ──────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Multer — memory storage for images + audio ───────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
      'audio/webm', 'audio/m4a', 'audio/aac', 'audio/x-m4a',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only images (JPG/PNG/WEBP) and audio files are accepted.'))
  },
})

function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File exceeds 20 MB limit.' })
    return res.status(400).json({ error: err.message })
  }
  if (err) return res.status(400).json({ error: err.message })
  next()
}

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
async function uploadToCloudinary(buffer, mimetype, folder) {
  ensureCloudinaryConfigured()
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('audio/') ? 'video' : 'image' // Cloudinary uses 'video' for audio
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => { if (err) reject(err); else resolve(result) }
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}

// ─── Groq Whisper transcription ───────────────────────────────────────────────
async function transcribeAudio(buffer, mimetype) {
  // Map MIME type to a file extension Whisper accepts
  const extMap = {
    'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav',
    'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/m4a': 'm4a',
    'audio/aac': 'aac', 'audio/x-m4a': 'm4a',
  }
  const ext = extMap[mimetype] || 'wav'
  // Groq SDK accepts a File-like object — use a Blob
  const { Blob } = require('buffer')
  const blob = new Blob([buffer], { type: mimetype })
  // Attach filename so the API knows the format
  blob.name = `voice.${ext}`

  const transcription = await groq.audio.transcriptions.create({
    file: blob,
    model: 'whisper-large-v3',
  })
  return transcription.text || ''
}

// ─── Budget mapping (reused from casaMatch.js) ────────────────────────────────
const BUDGET_MAP = {
  u50k:      { min: 0,       max: 50_000     },
  '50_150':  { min: 50_000,  max: 150_000    },
  '150_500': { min: 150_000, max: 500_000    },
  '500_1m':  { min: 500_000, max: 1_000_000  },
  above1m:   { min: 1_000_000, max: 999_999_999 },
}

// ─── Prisma search + Groq ranking (same logic as casaMatch.js) ────────────────
async function searchAndRankListings(criteria) {
  const prisma  = getPrisma()
  const budget  = BUDGET_MAP[criteria.budget] ?? { min: 0, max: 999_999_999 }

  const where = {
    status: 'Approved',
    price:  { gte: budget.min, lte: budget.max },
  }
  if (criteria.city)         where.city = { equals: criteria.city,         mode: 'insensitive' }
  if (criteria.propertyType) where.type = { equals: criteria.propertyType, mode: 'insensitive' }

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
  })

  if (!listings.length) return []

  // Build compact listing block for Groq
  const listingsBlock = listings.map((p, i) => {
    const facilities = Array.isArray(p.facilities)
      ? p.facilities
      : (() => { try { return JSON.parse(p.facilities || '[]') } catch { return [] } })()
    return (
      `[${i}] id=${p.id} | "${p.title}" | ` +
      `${p.bedrooms}bd ${p.bathrooms}ba ${p.toilets}wc ${p.parlors}pr | ` +
      `XAF ${Number(p.price).toLocaleString()} | ` +
      `city: ${p.city} | neighborhood: ${p.neighborhood ?? 'N/A'} | ` +
      `payment: ${p.paymentFrequency ?? 'N/A'} | ` +
      `facilities: ${facilities.slice(0, 6).join(', ') || 'N/A'} | ` +
      `desc: ${(p.description ?? '').slice(0, 120)}`
    )
  }).join('\n')

  const userPrefsBlock = `
USER PREFERENCES:
- Budget: ${criteria.budget}
- City: ${criteria.city ?? 'any'}
- Property type: ${criteria.propertyType ?? 'any'}
- Purpose: ${criteria.purpose ?? 'any'}
- Bedrooms: ${criteria.bedrooms ?? 1}, Bathrooms: ${criteria.bathrooms ?? 1}, Toilets: ${criteria.toilets ?? 1}, Kitchens: ${criteria.kitchens ?? 1}, Parlors: ${criteria.parlors ?? 0}
- Desired facilities: ${(criteria.facilities ?? []).join(', ') || 'none'}
- Description: "${criteria.description ?? ''}"
- Deal-breakers: ${(criteria.dealBreakers ?? []).join(', ') || 'none'}`.trim()

  const rankingResponse = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    max_tokens:  1500,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are CasaMatch AI, a real estate ranking engine for Cameroon.
Given user preferences and a list of properties, pick the TOP 5 best matches and score each 0–100.

Rules:
- Penalise properties that have deal-breakers the user listed.
- Reward properties matching desired facilities.
- Score based on bedroom/bathroom counts, price fit, location, and description quality.

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {"index": 0, "score": 92, "matchReason": "...", "badge": "Best Match"},
  ...
]

Use badge values: "Best Match" | "Great Value" | "Popular" | null.
matchReason must be 1 concise sentence explaining the fit.`,
      },
      {
        role: 'user',
        content: `${userPrefsBlock}\n\nAVAILABLE PROPERTIES:\n${listingsBlock}`,
      },
    ],
  })

  let ranked = []
  try {
    const raw = rankingResponse.choices[0].message.content.trim()
    // Strip possible markdown code fences
    const jsonStr = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    ranked = JSON.parse(jsonStr)
  } catch {
    // If ranking fails, return top 5 unranked
    ranked = listings.slice(0, 5).map((_, i) => ({
      index: i, score: 70, matchReason: 'Good match for your criteria.', badge: null,
    }))
  }

  return ranked.slice(0, 5).map(r => {
    const p   = listings[r.index]
    if (!p) return null
    const img = p.images?.[0]?.imageUrl ?? null
    const isRent = p.paymentFrequency && p.paymentFrequency !== 'For Sale'
    return {
      id:          String(p.id),
      score:       r.score,
      matchReason: r.matchReason,
      badge:       r.badge ?? null,
      name:        p.title,
      location:    [p.neighborhood, p.city, p.region].filter(Boolean).join(', '),
      price:       `XAF ${Number(p.price).toLocaleString()}${isRent ? `/${p.paymentFrequency === 'Yearly' ? 'yr' : 'mo'}` : ''}`,
      tags:        [p.type, `${p.bedrooms}bd`, `${p.bathrooms}ba`].filter(Boolean),
      images:      img ? [img] : [],
      listingType: isRent ? 'rent' : 'sale',
    }
  }).filter(Boolean)
}

// ─── System prompt factory ────────────────────────────────────────────────────
function buildSystemPrompt(language) {
  const lang = language === 'fr' ? 'French' : 'English'
  return `You are CasaMatch, a warm and knowledgeable real estate agent for Cameroon on the SweetCasa platform.
You help users find rental or purchase properties in Cameroon (all prices in XAF — Central African Franc).

LANGUAGE: Always respond in ${lang}. Never switch languages mid-conversation.

PERSONA: Friendly, professional, like a trusted local real estate advisor who knows Cameroon well.
Natural conversation — NOT a form or checklist. Ask one or two questions at a time, not everything at once.

YOUR GOAL: Gather the user's housing preferences naturally through chat, then search and present the best matching properties.

INFORMATION TO GATHER (conversationally, not as a list — you don't need all of it before searching):
- Budget in XAF — map mentally to: u50k = under 50K, 50_150 = 50K–150K, 150_500 = 150K–500K, 500_1m = 500K–1M, above1m = over 1M per month (renting) or total (buying)
- City in Cameroon
- Property type (Apartment, Studio, Villa, Office, Room, Duplex, Guest House, Hotel)
- Purpose (renting or buying)
- Room counts (bedrooms, bathrooms, toilets, kitchens, parlors) — ask as a group once you know type
- Desired facilities from: Wifi, Electricity, Water Supply, Gated, Parking, Green Area, Generator, School, Bank, Restaurant, Market, Clinic, Security
- Free description of any other preferences
- Deal-breakers (what they absolutely don't want)

WHEN TO SEARCH: Once you have budget + city + property type (at minimum), OR when the user explicitly asks to see options, trigger a search by placing this block as the VERY LAST thing in your message:

<SEARCH>{"budget":"50_150","city":"Douala","propertyType":"Apartment","purpose":"renting","bedrooms":2,"bathrooms":1,"toilets":1,"kitchens":1,"parlors":0,"facilities":["Wifi","Water Supply"],"description":"","dealBreakers":[]}</SEARCH>

IMPORTANT RULES:
- Only include <SEARCH>...</SEARCH> when triggering a search. Do NOT include it on every message.
- The <SEARCH> block must always be the LAST thing in your message. No text after it.
- For missing optional fields use defaults: bedrooms=1, bathrooms=1, toilets=1, kitchens=1, parlors=0, facilities=[], description="", dealBreakers=[].
- Budget must be one of: u50k, 50_150, 150_500, 500_1m, above1m.
- When user says "show me options", "find properties", "search now", etc. → trigger the search immediately.
- After the backend injects listing results, discuss and compare properties naturally. You can answer "why is X cheaper?", "does it have parking?", etc.
- Answer general questions about SweetCasa: listings are verified by the team; users can message sellers through the app; visits can be arranged in-app; SweetCasa covers all 10 regions of Cameroon.
- If the user uploads an image (e.g., a house style they like), acknowledge it and use it to understand their aesthetic preferences.
- If the user sends a voice note, the transcript will be provided in brackets [Voice transcript: ...] — respond naturally.
- Do not use emojis excessively — one or two is fine for warmth.
- Be encouraging and enthusiastic about helping them find their home.`
}

// ─── Detect language from text ────────────────────────────────────────────────
function detectLanguage(text) {
  // Simple heuristic: look for common French markers
  const frenchMarkers = /\b(je|tu|il|elle|nous|vous|ils|elles|bonjour|merci|oui|non|est|les|des|une|cherche|appartement|louer|acheter|chambre|maison|ville|région|budget|mois|année)\b/i
  return frenchMarkers.test(text) ? 'fr' : 'en'
}

// ─── Parse AI response for <SEARCH> trigger ───────────────────────────────────
function parseSearchTrigger(content) {
  const match = content.match(/<SEARCH>([\s\S]*?)<\/SEARCH>/)
  if (!match) return { text: content, criteria: null }
  const text = content.replace(/<SEARCH>[\s\S]*?<\/SEARCH>/, '').trim()
  let criteria = null
  try {
    criteria = JSON.parse(match[1].trim())
  } catch {
    // If JSON is malformed, ignore and don't search
  }
  return { text, criteria }
}

// ─── Apply auth to all routes in this router ──────────────────────────────────
router.use(requireRole())

// ─────────────────────────────────────────────────────────────────────────────
// GET /conversations  — list user's AI conversations (newest first)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const prisma = getPrisma()
    const conversations = await prisma.aiConversation.findMany({
      where:   { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id:        true,
        title:     true,
        language:  true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { content: true, role: true, createdAt: true },
        },
      },
    })
    res.json({ conversations })
  } catch (err) {
    console.error('[casamatchChat] GET /conversations error:', err)
    res.status(500).json({ error: 'Failed to fetch conversations.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /conversations  — create a new blank conversation
// ─────────────────────────────────────────────────────────────────────────────
router.post('/conversations', express.json(), async (req, res) => {
  try {
    const prisma = getPrisma()
    const conv = await prisma.aiConversation.create({
      data: { userId: req.user.id, title: 'New Chat', language: 'en' },
    })
    res.status(201).json({ conversation: conv })
  } catch (err) {
    console.error('[casamatchChat] POST /conversations error:', err)
    res.status(500).json({ error: 'Failed to create conversation.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /conversations/:id  — fetch conversation + all messages
// ─────────────────────────────────────────────────────────────────────────────
router.get('/conversations/:id', async (req, res) => {
  try {
    const prisma = getPrisma()
    const conv = await prisma.aiConversation.findFirst({
      where:   { id: Number(req.params.id), userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })
    res.json({ conversation: conv })
  } catch (err) {
    console.error('[casamatchChat] GET /conversations/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch conversation.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /conversations/:id  — delete a conversation
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/conversations/:id', async (req, res) => {
  try {
    const prisma = getPrisma()
    const conv = await prisma.aiConversation.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    })
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' })
    await prisma.aiConversation.delete({ where: { id: conv.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[casamatchChat] DELETE /conversations/:id error:', err)
    res.status(500).json({ error: 'Failed to delete conversation.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /conversations/:id/messages  — send a message
//   multipart/form-data fields:
//     content  (text, required)
//     image    (file, optional — JPG/PNG/WEBP)
//     audio    (file, optional — MP3/WAV/OGG/etc.)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/conversations/:id/messages',
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
  handleMulterError,
  async (req, res) => {
    const prisma    = getPrisma()
    const convId    = Number(req.params.id)
    const userText  = (req.body?.content || '').trim()
    const imageFile = req.files?.image?.[0]
    const audioFile = req.files?.audio?.[0]

    if (!userText && !imageFile && !audioFile) {
      return res.status(400).json({ error: 'Message must contain text, an image, or an audio file.' })
    }

    try {
      // ── 1. Verify conversation belongs to this user ──────────────────────
      const conv = await prisma.aiConversation.findFirst({
        where:   { id: convId, userId: req.user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            // Only load last 20 messages to keep context window manageable
            take: -20,
          },
        },
      })
      if (!conv) return res.status(404).json({ error: 'Conversation not found.' })

      // ── 2. Detect language (from first user message) ─────────────────────
      let language = conv.language
      if (conv.messages.length === 0 && userText) {
        language = detectLanguage(userText)
      }

      // ── 3. Handle image upload ───────────────────────────────────────────
      let imageUrl = null
      if (imageFile) {
        const result = await uploadToCloudinary(imageFile.buffer, imageFile.mimetype, 'casamatch_chat_images')
        imageUrl = result.secure_url
      }

      // ── 4. Handle audio upload + transcription ───────────────────────────
      let audioUrl       = null
      let audioTranscript = null
      if (audioFile) {
        const [cloudResult, transcript] = await Promise.all([
          uploadToCloudinary(audioFile.buffer, audioFile.mimetype, 'casamatch_chat_audio'),
          transcribeAudio(audioFile.buffer, audioFile.mimetype),
        ])
        audioUrl        = cloudResult.secure_url
        audioTranscript = transcript
      }

      // ── 5. Build user message content ────────────────────────────────────
      let fullUserContent = userText
      if (audioTranscript) {
        fullUserContent = fullUserContent
          ? `${fullUserContent}\n[Voice transcript: ${audioTranscript}]`
          : `[Voice transcript: ${audioTranscript}]`
      }
      if (imageUrl) {
        fullUserContent = fullUserContent
          ? `${fullUserContent}\n[User attached an image: ${imageUrl}]`
          : `[User attached an image: ${imageUrl}]`
      }

      // ── 6. Save user message to DB ───────────────────────────────────────
      const userMsg = await prisma.aiChatMessage.create({
        data: {
          conversationId: convId,
          role:           'user',
          content:        userText || (audioTranscript ? `[Voice message]` : '[Image]'),
          imageUrl,
          audioUrl,
          audioTranscript,
        },
      })

      // ── 7. Build messages array for Groq ─────────────────────────────────
      const historyMessages = conv.messages.map(m => ({
        role:    m.role,
        content: m.content + (m.listingResults ? `\n[Search results were shown to the user]` : ''),
      }))

      const groqMessages = [
        { role: 'system', content: buildSystemPrompt(language) },
        ...historyMessages,
        { role: 'user', content: fullUserContent || '[User sent a file]' },
      ]

      // ── 8. Call Groq ─────────────────────────────────────────────────────
      const chatResponse = await groq.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  800,
        temperature: 0.6,
        messages:    groqMessages,
      })

      const rawAiContent = chatResponse.choices[0].message.content || ''

      // ── 9. Parse search trigger ───────────────────────────────────────────
      const { text: aiText, criteria } = parseSearchTrigger(rawAiContent)

      // ── 10. If search triggered: run Prisma search + re-ranking ──────────
      let listings       = null
      let finalAiContent = aiText

      if (criteria) {
        listings = await searchAndRankListings(criteria)

        if (listings.length > 0) {
          // Call Groq again to generate a friendly "here are your results" message
          const resultsBlock = listings.map((l, i) =>
            `[${i + 1}] ${l.name} — ${l.location} — ${l.price} — ${l.score}% match — ${l.matchReason}`
          ).join('\n')

          const followUpResponse = await groq.chat.completions.create({
            model:       'llama-3.3-70b-versatile',
            max_tokens:  400,
            temperature: 0.5,
            messages: [
              { role: 'system', content: buildSystemPrompt(language) },
              ...groqMessages,
              {
                role: 'assistant',
                content: `[I found ${listings.length} matching properties. Here are the results:]\n${resultsBlock}`,
              },
              {
                role: 'user',
                content: 'Please introduce these results to me warmly and tell me about the top picks.',
              },
            ],
          })

          finalAiContent = followUpResponse.choices[0].message.content || aiText
        } else {
          // No listings found
          finalAiContent = language === 'fr'
            ? "Je n'ai trouvé aucune propriété correspondant exactement à vos critères pour le moment. Voulez-vous élargir vos critères — peut-être ajuster le budget ou la ville ?"
            : "I couldn't find any properties matching those exact criteria right now. Would you like to broaden your search — perhaps adjust the budget or city?"
        }
      }

      // ── 11. Save AI message to DB ─────────────────────────────────────────
      const aiMsg = await prisma.aiChatMessage.create({
        data: {
          conversationId: convId,
          role:           'assistant',
          content:        finalAiContent,
          listingResults: listings ? listings : undefined,
        },
      })

      // ── 12. Update conversation title (from first user message) ───────────
      const updates = { language, updatedAt: new Date() }
      if (conv.messages.length === 0 && userText) {
        updates.title = userText.length > 60 ? userText.slice(0, 57) + '…' : userText
      }
      await prisma.aiConversation.update({ where: { id: convId }, data: updates })

      // ── 13. Respond ───────────────────────────────────────────────────────
      res.json({
        userMessage: userMsg,
        aiMessage: {
          ...aiMsg,
          listingResults: listings,
        },
      })
    } catch (err) {
      console.error('[casamatchChat] POST /conversations/:id/messages error:', err)
      res.status(500).json({ error: 'Failed to process message. Please try again.' })
    }
  }
)

module.exports = router
