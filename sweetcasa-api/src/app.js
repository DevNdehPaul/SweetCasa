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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`SweetCasa API running on port ${PORT}`))