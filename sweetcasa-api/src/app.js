require('dotenv').config()
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth.routes')

const app = express()

app.use(cors({
  origin: '*',
}))

app.use(express.json())
app.use('/auth', authRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`SweetCasa API running on port ${PORT}`))