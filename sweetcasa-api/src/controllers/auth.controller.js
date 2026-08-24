const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const streamifier = require('streamifier')
const { OAuth2Client } = require('google-auth-library')
const appleSignin = require('apple-signin-auth')
require('dotenv').config()

const { getPrisma } = require('../lib/prisma')
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const { sendMail } = require('../lib/email')

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
  const fallback = normalizeEmail(email).split('@')[0] || 'SweetCasa User'

  return role === 'SELLER'
    ? sellerName || fallback
    : buyerName || fallback
}

function toProfile(user) {
  return {
    id: user.id,
    name: user.name,
    fullName: user.role === 'BUYER' ? user.name : '',
    companyName: user.companyName || '',
    email: user.email,
    phone: String(user.phone ?? ''),
    role: user.role,
    status: user.status,
    authProvider: user.authProvider || 'LOCAL',
    country: user.country || '',
    region: user.region || '',
    city: user.city || '',
    street: user.street || '',
    nationalIdUrl: user.nationalIdUrl || '',
    createdAt: user.createdAt,
  }
}

// ─── Social auth (Google / Apple) ──────────────────────────────────────────

const googleClient = new OAuth2Client()

// All client IDs (iOS, Android, web) that are allowed to mint tokens we accept.
const GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID,
].filter(Boolean)

async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_IDS.length) {
    throw new Error('Google sign-in is not configured (no GOOGLE_*_CLIENT_ID set).')
  }
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_IDS })
  const payload = ticket.getPayload()
  if (!payload?.email_verified) {
    throw new Error('Google account email is not verified.')
  }
  return { providerId: payload.sub, email: payload.email, name: payload.name || '' }
}

async function verifyAppleToken(idToken) {
  if (!process.env.APPLE_CLIENT_ID) {
    throw new Error('Apple sign-in is not configured (no APPLE_CLIENT_ID set).')
  }
  // Apple's token never carries the user's name — it's only ever handed to
  // the client once, on the very first authorization. The frontend must
  // capture it then and pass it up as `fullName` in the request body.
  const payload = await appleSignin.verifyIdToken(idToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  })
  return { providerId: payload.sub, email: payload.email, name: null }
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

    // ── Upload National ID to Cloudinary ──────────────────────────────────────
    const isPdf = req.file.mimetype === 'application/pdf'
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'sweetcasa/national_ids',
      resource_type: isPdf ? 'raw' : 'image',
      // Keep originals; no destructive transforms on identity documents
      use_filename: false,
      unique_filename: true,
    })

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await getPrisma().user.create({
      data: {
        name: fullName ? String(fullName).trim() : companyName ? String(companyName).trim() : null,
        companyName: userRole === 'SELLER'
          ? String(companyName || '').trim() || null
          : null,
        email: normalizedEmail,
        password: hashedPassword,
        phone: normalizePhone(phone),
        role: userRole,
        country: String(country || '').trim() || null,
        region: String(region || '').trim() || null,
        city: String(city || '').trim() || null,
        street: String(street || '').trim() || null,
        nationalIdUrl: uploadResult.secure_url,
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

// ─── Social auth (Google / Apple) ──────────────────────────────────────────
// POST /auth/social  { provider: 'GOOGLE' | 'APPLE', idToken, role, fullName?, companyName? }
//
// Creates or logs into an account with NO password — the account can only
// ever be accessed by presenting a valid Google/Apple idToken again. We
// verify that token server-side; we never trust identity fields from the
// request body, only `role`/`fullName`/`companyName`, which are legitimate
// user choices Google/Apple don't know about.
//
// National ID upload is required elsewhere in this app but multipart file
// upload doesn't fit an OAuth callback, so a social account is created with
// nationalIdUrl empty. The response's `profileComplete` flag tells the
// frontend to route the user to "finish your profile" (PUT /auth/profile,
// which already accepts an optional nationalId file) before letting them
// list a property, message a seller, or pay.
exports.socialAuth = async (req, res) => {
  try {
    const { provider, idToken, role, fullName, companyName } = req.body

    if (!['GOOGLE', 'APPLE'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider.' })
    }
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken.' })
    }

    let verified
    try {
      verified = provider === 'GOOGLE'
        ? await verifyGoogleToken(idToken)
        : await verifyAppleToken(idToken)
    } catch (verifyErr) {
      console.error(`${provider} token verification failed:`, verifyErr.message)
      return res.status(401).json({ error: 'Could not verify your account. Please try again.' })
    }

    const normalizedEmail = normalizeEmail(verified.email)
    if (!normalizedEmail) {
      return res.status(400).json({ error: `${provider} did not return an email address.` })
    }

    const prisma = getPrisma()
    const providerField = provider === 'GOOGLE' ? 'googleId' : 'appleId'

    // 1. Already linked to this provider → returning social login.
    let user = await prisma.user.findFirst({ where: { [providerField]: verified.providerId } })

    if (!user) {
      // 2. An account with this email already exists (password account, or
      //    signed up with the other provider) → link this provider to it
      //    instead of creating a duplicate account with the same email.
      user = await prisma.user.findFirst({ where: { email: normalizedEmail } })

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { [providerField]: verified.providerId },
        })
      } else {
        // 3. Brand new account — no password, ever.
        const userRole = normalizeRole(role)
        const name = buildDisplayName({
          role: userRole,
          fullName: fullName || verified.name,
          companyName,
          email: normalizedEmail,
        })

        user = await prisma.user.create({
          data: {
            name,
            companyName: userRole === 'SELLER' ? String(companyName || '').trim() || null : null,
            email: normalizedEmail,
            password: null,
            authProvider: provider,
            [providerField]: verified.providerId,
            role: userRole,
          },
        })
      }
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact SweetCasa support if you believe this is a mistake.',
        code: 'ACCOUNT_SUSPENDED',
      })
    }

    const token = signToken(user)
    res.json({
      token,
      role: user.role,
      profile: toProfile(user),
      profileComplete: Boolean(user.nationalIdUrl),
    })
  } catch (err) {
    console.error(`${req.body?.provider || 'Social'} auth error:`, err)
    res.status(500).json({ error: 'Sign-in failed.' })
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

    // Social accounts have no password — bcrypt.compare would throw on null.
    // Tell the user which provider to use instead of a generic failure.
    if (!user.password) {
      const providerName = user.authProvider === 'APPLE' ? 'Apple' : 'Google'
      return res.status(400).json({
        error: `This account signed up with ${providerName}. Please continue with ${providerName} Sign-In instead.`,
        code: 'SOCIAL_ACCOUNT_NO_PASSWORD',
      })
    }

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
        error: `This account is not registered as a ${normalizeRole(expectedRole) === 'BUYER' ? 'House Seeker' : 'House Owner'
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

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// POST /auth/forgot-password  { email }
// Verifies the account exists, then generates a 6-digit reset code (valid
// 10 minutes), stores its SHA-256 hash on the user, and emails the code to the
// inbox. If the account does not exist, returns 404 with a clear message.
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    if (!email) {
      return res.status(400).json({ error: 'Please enter your email address.' })
    }

    const user = await getPrisma().user.findFirst({ where: { email } })

    // User has no account — tell them clearly (per product requirement).
    if (!user) {
      return res.status(404).json({
        error: `No account found for "${email}". Please try again or create an account.`,
        code: 'NO_ACCOUNT',
      })
    }

    // ── Generate a 6-digit numeric reset code ────────────────────────────────
    const resetCode = crypto.randomInt(100000, 1000000).toString() // 6-digit
    const codeHash = crypto.createHash('sha256').update(resetCode).digest('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await getPrisma().user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: codeHash,
        passwordResetExpires: expiresAt,
      },
    })

    const name = user.name || user.companyName || 'there'
    await sendMail({
      to: user.email,
      subject: 'Your SweetCasa password reset code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #EDE9FE;border-radius:16px;">
          <h2 style="color:#5B21B6;margin:0 0 8px;">SweetCasa</h2>
          <p style="color:#374151;font-size:14px;line-height:1.6;">Hi ${name},</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;">
            We received a request to reset your SweetCasa password. Use the code below to
            verify your identity and choose a new password. This code expires in
            <strong>10 minutes</strong>.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <span style="display:inline-block;background:#F5F3FF;color:#5B21B6;font-size:28px;font-weight:800;letter-spacing:8px;padding:14px 28px;border-radius:12px;border:1px solid #EDE9FE;">
              ${resetCode}
            </span>
          </p>
          <p style="color:#9CA3AF;font-size:12px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email. Your password will
            not be changed until you enter this code and set a new one.
          </p>
          <hr style="border:none;border-top:1px solid #F0F0F0;margin:20px 0;" />
          <p style="color:#B0B0B0;font-size:11px;">
            Enter this code in the SweetCasa app to continue resetting your password.
          </p>
        </div>
      `,
    })

    res.json({ message: 'A verification code has been sent to your email.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Failed to send password reset code.' })
  }
}

// ─── VERIFY RESET CODE ────────────────────────────────────────────────────────
// POST /auth/verify-reset-code  { email, code }
// Validates the 6-digit code (hashed) and expiry for the given email.
exports.verifyResetCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const code = String(req.body?.code || '').trim()

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' })
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'The verification code must be 6 digits.' })
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex')

    const user = await getPrisma().user.findFirst({
      where: {
        email,
        passwordResetToken: codeHash,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return res.status(400).json({ error: 'The verification code is invalid or has expired. Please request a new one.' })
    }

    res.json({ message: 'Code verified. You can now set a new password.' })
  } catch (err) {
    console.error('Verify reset code error:', err)
    res.status(500).json({ error: 'Failed to verify the code.' })
  }
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
// POST /auth/reset-password  { email, code, password }
// Validates the (hashed) code and expiry, then updates the password.
exports.resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, code, password } = req.body || {}
    const email = normalizeEmail(rawEmail)

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' })
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' })
    }
    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ error: 'The verification code must be 6 digits.' })
    }

    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex')

    const user = await getPrisma().user.findFirst({
      where: {
        email,
        passwordResetToken: codeHash,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return res.status(400).json({ error: 'The verification code is invalid or has expired. Please request a new one.' })
    }

    const hashedPassword = await bcrypt.hash(String(password), 12)

    await getPrisma().user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    res.json({ message: 'Your password has been reset successfully. You can now log in with your new password.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password.' })
  }
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

    if (name !== undefined) data.name = String(name).trim()
    if (companyName !== undefined) data.companyName = String(companyName).trim()
    if (country !== undefined) data.country = String(country).trim()
    if (region !== undefined) data.region = String(region).trim()
    if (city !== undefined) data.city = String(city).trim()
    if (street !== undefined) data.street = String(street).trim()

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
        folder: 'sweetcasa/national_ids',
        resource_type: isPdf ? 'raw' : 'image',
        unique_filename: true,
      })
      data.nationalIdUrl = uploadResult.secure_url
      data.nationalIdPublicId = uploadResult.public_id
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' })
    }

    const updated = await getPrisma().user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        role: true,
        country: true,
        region: true,
        city: true,
        street: true,
        nationalIdUrl: true,
        nationalIdPublicId: true,
        createdAt: true,
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