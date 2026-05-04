const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

// Lazy-load Prisma only when needed
let prisma = null
function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    prisma = new PrismaClient({ adapter })
  }
  return prisma
}

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )

// ── POST /auth/register ───────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      email, password, role,
      // Buyer fields
      fullName, phone, country, region, city, street,
      // Seller fields
      companyName,
    } = req.body

    const allowedRoles = ['BUYER', 'SELLER']
    const userRole = allowedRoles.includes(role?.toUpperCase())
      ? role.toUpperCase()
      : 'BUYER'

    // Check email not already taken
    const existing = await getPrisma().user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use.' })

    const hashed = await bcrypt.hash(password, 12)

    // Create user + profile in one transaction
    const user = await getPrisma().$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, password: hashed, role: userRole },
      })

      if (userRole === 'BUYER') {
        await tx.buyerProfile.create({
          data: {
            userId:   newUser.id,
            fullName: fullName  || '',
            phone:    phone     || '',
            country:  country   || '',
            region:   region    || '',
            city:     city      || '',
            street:   street    || '',
          },
        })
      }

      if (userRole === 'SELLER') {
        await tx.sellerProfile.create({
          data: {
            userId:      newUser.id,
            companyName: companyName || '',
            phone:       phone       || '',
            country:     country     || '',
            region:      region      || '',
            city:        city        || '',
            street:      street      || '',
          },
        })
      }

      return newUser
    })

    const token = signToken(user)
    res.status(201).json({ token, role: user.role })

  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed.' })
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body

    const user = await getPrisma().user.findUnique({
      where: { email },
      include: {
        buyerProfile:  true,
        sellerProfile: true,
      },
    })

    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' })

    // ← NEW: block wrong portal logins
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        error: `This account is not registered as a ${expectedRole === 'BUYER' ? 'House Seeker' : 'House Owner'}. Please use the correct portal.`
      })
    }

    const token = signToken(user)
    const profile = user.buyerProfile || user.sellerProfile || null
    res.json({ token, role: user.role, profile })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed.' })
  }
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────
exports.logout = (_req, res) => {
  res.json({ message: 'Logged out. Discard your token on the client.' })
}
