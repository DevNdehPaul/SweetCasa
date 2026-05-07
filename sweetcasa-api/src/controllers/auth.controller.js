const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const { getPrisma } = require('../lib/prisma')

const ALLOWED_ROLES = ['BUYER', 'SELLER']

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )

function normalizeRole(role) {
  const normalizedRole = String(role || '').toUpperCase()
  return ALLOWED_ROLES.includes(normalizedRole) ? normalizedRole : 'BUYER'
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return 0

  const parsed = Number.parseInt(digits, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function buildDisplayName({ role, fullName, companyName, email }) {
  const sellerName = String(companyName || '').trim() || String(fullName || '').trim()
  const buyerName = String(fullName || '').trim() || String(companyName || '').trim()
  const fallbackName = normalizeEmail(email).split('@')[0] || 'SweetCasa User'

  return role === 'SELLER'
    ? sellerName || fallbackName
    : buyerName || fallbackName
}

function toProfile(user) {
  return {
    id: user.id,
    fullName: user.role === 'BUYER' ? user.name : '',
    companyName: user.companyName || '',
    name: user.name,
    email: user.email,
    phone: String(user.phone ?? ''),
    role: user.role,
    avatar: user.avatar,
    country: user.country || '',
    region: user.region || '',
    city: user.city || '',
    street: user.street || '',
    isVerified: user.isVerified,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt,
  }
}

exports.register = async (req, res) => {
  try {
    console.log(req.body);
    const {
      email,
      password,
      role,
      fullName,
      phone,
      companyName,
      country,
      region,
      city,
      street,
    } = req.body

    const normalizedEmail = normalizeEmail(email)
    const userRole = normalizeRole(role)
    const name = buildDisplayName({
      role: userRole,
      fullName,
      companyName,
      email: normalizedEmail,
    })

    if (!normalizedEmail || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }

    const existing = await getPrisma().user.findFirst({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return res.status(409).json({ error: 'Email already in use.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await getPrisma().user.create({
      data: {
        name,
        companyName: String(companyName || '').trim() || null,
        email: normalizedEmail,
        password: hashedPassword,
        phone: normalizePhone(phone),
        role: userRole,
        avatar: '',
        country: String(country || '').trim() || null,
        region: String(region || '').trim() || null,
        city: String(city || '').trim() || null,
        street: String(street || '').trim() || null,
      },
    })

    const token = signToken(user)
    res.status(201).json({ token, role: user.role, profile: toProfile(user) })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed.' })
  }
}

exports.login = async (req, res) => {
  console.log(req.body);
  try {
    const { email, password, expectedRole } = req.body
    const normalizedEmail = normalizeEmail(email)

    const user = await getPrisma().user.findFirst({
      where: { email: normalizedEmail },
    })

    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })
    if (user.isSuspended) return res.status(403).json({ error: 'This account has been suspended.' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' })

    if (expectedRole && user.role !== normalizeRole(expectedRole)) {
      return res.status(403).json({
        error: `This account is not registered as a ${normalizeRole(expectedRole) === 'BUYER' ? 'House Seeker' : 'House Owner'}. Please use the correct portal.`,
      })
    }

    const token = signToken(user)
    res.json({ token, role: user.role, profile: toProfile(user) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed.' })
  }
}

exports.logout = (_req, res) => {
  res.json({ message: 'Logged out. Discard your token on the client.' })
}
