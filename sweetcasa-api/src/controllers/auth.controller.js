const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const streamifier = require('streamifier')
require('dotenv').config()

const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')

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
  const buyerName  = String(fullName || '').trim()  || String(companyName || '').trim()
  const fallback   = normalizeEmail(email).split('@')[0] || 'SweetCasa User'

  return role === 'SELLER'
    ? sellerName || fallback
    : buyerName  || fallback
}

function toProfile(user) {
  return {
    id:             user.id,
    name:           user.name,
    fullName:       user.role === 'BUYER' ? user.name : '',
    companyName:    user.companyName || '',
    email:          user.email,
    phone:          String(user.phone ?? ''),
    role:           user.role,
    status:         user.status,
    country:        user.country        || '',
    region:         user.region         || '',
    city:           user.city           || '',
    street:         user.street         || '',
    nationalIdUrl:  user.nationalIdUrl  || '',
    createdAt:      user.createdAt,
  }
}

// ─── Upload buffer to Cloudinary (stream-based, works with multer memoryStorage) ─
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    ensureCloudinaryConfigured()
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      resolve(result)
    })
    streamifier.createReadStream(buffer).pipe(stream)
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────
// The frontend must send role: 'BUYER'  from the House Seeker signup page
//                          role: 'SELLER' from the House Owner signup page
// The request must be multipart/form-data with a "nationalId" file field.

exports.register = async (req, res) => {
  try {
    console.log(req.body)

    const {
      email,
      password,
      role,        // 'BUYER' | 'SELLER' — sent by the frontend
      fullName,
      phone,
      companyName, // only used when role === 'SELLER'
      country,
      region,
      city,
      street,
    } = req.body

    // ── Validate National ID file ──────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        error: 'National ID card is required. Please upload a photo or PDF of your ID.',
      })
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Only JPG, PNG, WEBP images and PDF documents are accepted.',
      })
    }

    // 5 MB limit guard (belt-and-suspenders alongside multer limits)
    const MAX_BYTES = 5 * 1024 * 1024
    if (req.file.size > MAX_BYTES) {
      return res.status(400).json({
        error: 'National ID file is too large. Maximum allowed size is 5 MB.',
      })
    }

    const normalizedEmail = normalizeEmail(email)
    const userRole        = normalizeRole(role)

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

    // ── Upload National ID to Cloudinary ──────────────────────────────────────
    const isPdf       = req.file.mimetype === 'application/pdf'
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder:        'sweetcasa/national_ids',
      resource_type: isPdf ? 'raw' : 'image',
      // Keep originals; no destructive transforms on identity documents
      use_filename:  false,
      unique_filename: true,
    })

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await getPrisma().user.create({
      data: {
        name:              fullName ? String(fullName).trim() : companyName ? String(companyName).trim() : null,
        companyName:       userRole === 'SELLER'
                             ? String(companyName || '').trim() || null
                             : null,
        email:             normalizedEmail,
        password:          hashedPassword,
        phone:             normalizePhone(phone),
        role:              userRole,
        country:           String(country || '').trim() || null,
        region:            String(region  || '').trim() || null,
        city:              String(city    || '').trim() || null,
        street:            String(street  || '').trim() || null,
        nationalIdUrl:     uploadResult.secure_url,
        nationalIdPublicId: uploadResult.public_id,
      },
    })

    const token = signToken(user)
    res.status(201).json({ token, role: user.role, profile: toProfile(user) })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed.' })
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  console.log(req.body)
  try {
    const { email, password, expectedRole } = req.body
    const normalizedEmail = normalizeEmail(email)

    const user = await getPrisma().user.findFirst({
      where: { email: normalizedEmail },
    })

    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' })

    if (user.status === 'Suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact SweetCasa support if you believe this is a mistake.',
        code: 'ACCOUNT_SUSPENDED',
      })
    }

    if (expectedRole && user.role !== normalizeRole(expectedRole)) {
      return res.status(403).json({
        error: `This account is not registered as a ${
          normalizeRole(expectedRole) === 'BUYER' ? 'House Seeker' : 'House Owner'
        }. Please use the correct portal.`,
      })
    }

    const token = signToken(user)
    res.json({ token, role: user.role, profile: toProfile(user) })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed.' })
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = (_req, res) => {
  res.json({ message: 'Logged out. Discard your token on the client.' })
}

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
// PUT /auth/profile  (requires auth middleware)
exports.updateProfile = async (req, res) => {
  try {
    const { getPrisma } = require('../lib/prisma')
    const userId = req.user.id

    const {
      name,
      companyName,
      phone,
      country,
      region,
      city,
      street,
    } = req.body

    const data = {}

    if (name        !== undefined) data.name        = String(name).trim()
    if (companyName !== undefined) data.companyName = String(companyName).trim()
    if (country     !== undefined) data.country     = String(country).trim()
    if (region      !== undefined) data.region      = String(region).trim()
    if (city        !== undefined) data.city        = String(city).trim()
    if (street      !== undefined) data.street      = String(street).trim()

    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const cleaned = String(phone).replace(/\D/g, '')
      if (cleaned) data.phone = BigInt(cleaned)
    }

    // ── Optional: replace National ID on profile update ───────────────────────
    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type for National ID.' })
      }
      const isPdf = req.file.mimetype === 'application/pdf'
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder:          'sweetcasa/national_ids',
        resource_type:   isPdf ? 'raw' : 'image',
        unique_filename: true,
      })
      data.nationalIdUrl      = uploadResult.secure_url
      data.nationalIdPublicId = uploadResult.public_id
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' })
    }

    const updated = await getPrisma().user.update({
      where: { id: userId },
      data,
      select: {
        id:                true,
        name:              true,
        companyName:       true,
        email:             true,
        phone:             true,
        role:              true,
        country:           true,
        region:            true,
        city:              true,
        street:            true,
        nationalIdUrl:     true,
        nationalIdPublicId: true,
        createdAt:         true,
      },
    })

    const profile = {
      ...updated,
      phone: updated.phone !== null ? updated.phone.toString() : null,
    }

    res.json({ profile })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: err.message || 'Failed to update profile.' })
  }
}