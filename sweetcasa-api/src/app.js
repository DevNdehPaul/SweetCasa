require('dotenv').config()
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth.routes')

const app = express()

// Allow requests from your Expo web app
app.use(cors({
  origin: 'http://localhost:8081',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use('/auth', authRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`SweetCasa API running on port ${PORT}`))