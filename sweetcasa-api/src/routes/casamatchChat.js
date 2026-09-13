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
const { searchAndRankListings }               = require('../lib/casaMatchEngine')

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

WHEN TO SEARCH: Search as soon as the user explicitly asks for houses/properties/options/listings, even if they did not give budget, city, or property type. If they are only describing preferences conversationally, you may ask one useful follow-up first. Trigger a search by placing this block as the VERY LAST thing in your message:

<SEARCH>{"budget":"50_150","city":"Douala","propertyType":"Apartment","purpose":"renting","bedrooms":2,"bathrooms":1,"toilets":1,"kitchens":1,"parlors":0,"facilities":["Wifi","Water Supply"],"description":"","dealBreakers":[]}</SEARCH>

IMPORTANT RULES:
- Only include <SEARCH>...</SEARCH> when triggering a search. Do NOT include it on every message.
- The <SEARCH> block must always be the LAST thing in your message. No text after it.
- Missing criteria must stay neutral: use null for budget/city/propertyType/purpose/room counts, and [] for facilities/dealBreakers. NEVER invent bedroom counts, a city, a budget, or a property type the user did not provide.
- Understand broad terms naturally: house/maison can include residential house types such as bungalow, duplex and villa; a place name may be a neighborhood rather than a city.
- The database, not you, decides whether listings exist. Never tell the user there are no properties unless the backend search result says the eligible inventory is actually empty.
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
        model:       'openai/gpt-oss-120b',
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
        const match = await searchAndRankListings(criteria)
        listings = match.results

        if (listings.length > 0) {
          // Call Groq again to generate a friendly "here are your results" message
          const resultsBlock = listings.map((l, i) =>
            `[${i + 1}] ${l.name} — ${l.location} — ${l.price} — ${l.score}% match — ${l.matchReason}`
          ).join('\n')

          const followUpResponse = await groq.chat.completions.create({
            model:       'openai/gpt-oss-120b',
            max_tokens:  400,
            temperature: 0.5,
            messages: [
              { role: 'system', content: buildSystemPrompt(language) },
              ...groqMessages,
              {
                role: 'assistant',
                content: `[Database search mode: ${match.matchMode}. I found ${listings.length} real available SweetCasa properties. ${match.matchMode === 'close' ? 'These are close matches because no exact match was found.' : 'These are exact/strong matches.'}]\n${resultsBlock}`,
              },
              {
                role: 'user',
                content: 'Please introduce these results to me warmly and tell me about the top picks.',
              },
            ],
          })

          finalAiContent = followUpResponse.choices[0].message.content || aiText
        } else {
          // Only say inventory is empty after the database engine confirms it.
          finalAiContent = language === 'fr'
            ? "Il n'y a actuellement aucune annonce SweetCasa approuvée et disponible dans l'inventaire. Réessayez plus tard ou modifiez votre recherche."
            : "There are currently no approved, available SweetCasa listings in the inventory. Please try again later or change your search."
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
