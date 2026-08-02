require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const authRoutes         = require('./routes/auth.routes')
const listingRoutes      = require('./routes/listing.routes')
const reportRoutes       = require('./routes/Reportroutes')
const messageRoutes      = require('./routes/message.routes')
const casaMatchRoute     = require('./routes/casaMatch')
const casamatchChatRoute = require('./routes/casamatchChat')   // ← NEW
const adminRoutes        = require('./routes/admin.routes')    // ← NEW (admin dashboard)
const documentRoutes     = require('./routes/document.routes') // ← NEW (Document Vault review queue)
const walletRoutes       = require('./routes/wallet.routes')   // ← NEW (Escrow Wallet)
const adminRoutes = require('./routes/admin.routes')    // ← NEW (admin dashboard)
const documentRoutes = require('./routes/document.routes') // ← NEW (Document Vault review queue)
const notificationRoutes = require('./routes/notification.routes') // ← NEW (push notifications)
const favouriteRoutes = require('./routes/favourites.routes') // ← NEW (favourites / saved listings)
const { ensureDatabaseCompatibility } = require('./lib/db-compat')
const { getPrisma }      = require('./lib/prisma')

const app = express()

app.use(cors({ origin: '*' }))

// ✅ Do NOT use express.json() globally — it consumes the stream before
//    multer can parse multipart/form-data requests (listings upload).
//    Apply JSON parsing only to routes that need it.
app.use('/auth',                      express.json(), authRoutes)
app.use('/reports',                   express.json(), reportRoutes)
app.use('/messages/conversations',    messageRoutes)
app.use('/api/casa-match',            express.json(), casaMatchRoute)
app.use('/api/casamatch-chat',        casamatchChatRoute)   // ← NEW
app.use('/admin',                     express.json(), adminRoutes)     // ← NEW
app.use('/documents',                 express.json(), documentRoutes) // ← NEW (handles its own body parsing)
app.use('/wallet',                    express.json(), walletRoutes)   // ← NEW (Escrow Wallet + Fapshi webhook)
app.use('/auth', express.json(), authRoutes)
app.use('/reports', express.json(), reportRoutes)
app.use('/messages/conversations', messageRoutes)
app.use('/api/casa-match', express.json(), casaMatchRoute)
app.use('/api/casamatch-chat', casamatchChatRoute)   // ← NEW
app.use('/admin', express.json(), adminRoutes)     // ← NEW
app.use('/documents', express.json(), documentRoutes) // ← NEW (handles its own body parsing)
app.use('/notifications', express.json(), notificationRoutes) // ← NEW (push notifications)
app.use('/favourites', express.json(), favouriteRoutes) // ← NEW (favourites)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Listings route handles its own body parsing via multer middleware
app.use('/listings', listingRoutes)

process.on('uncaughtException',  (err) => console.error('UNCAUGHT:', err))
process.on('unhandledRejection', (err) => console.error('REJECTION:', err))

app.get('/db-test', async (_req, res) => {
  try {
    const prisma = getPrisma()
    await prisma.$queryRawUnsafe('SELECT 1')
    const userCount    = await prisma.user.count()
    const listingCount = await prisma.listing.count()
    const msgCount     = await prisma.message.count()
    res.json({ db: 'connected', users: userCount, listings: listingCount, messages: msgCount })
  } catch (err) {
    res.status(500).json({ db: 'failed', error: err.message })
  }
})

const PORT = process.env.PORT || 3000

async function bootstrap() {
  await ensureDatabaseCompatibility()
  await getPrisma().$connect()
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SweetCasa API running on port ${PORT}`)
  })
}

bootstrap().catch((err) => {
  console.error('Startup failed:', err)
  process.exit(1)
})
