require('dotenv').config()
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth.routes')
const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

// ADD THIS BEFORE auth routes
app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/auth', authRoutes)

process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err))
process.on('unhandledRejection', (err) => console.error('REJECTION:', err))
app.get('/db-test', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    const prisma = new PrismaClient({ adapter })
    await prisma.$connect()
    res.json({ db: 'connected ✅' })
  } catch (err) {
    res.json({ db: 'failed ❌', error: err.message })
  }
})
const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => console.log(`SweetCasa API running on port ${PORT}`))
