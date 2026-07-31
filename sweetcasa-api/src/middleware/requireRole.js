const jwt = require('jsonwebtoken')
const { getPrisma } = require('../lib/prisma')

// This does a DB lookup on every authenticated request (not just JWT decode).
// That's the trade-off for enforcing suspension in near-real-time: JWTs are
// stateless, so a suspended user's existing token would otherwise keep working
// until it naturally expires. This way, their very next API call after being
// suspended gets rejected — the client is expected to treat 403/ACCOUNT_SUSPENDED
// as a forced logout (clear the stored token, send them to the login screen).
const requireRole = (...roles) => async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided.' })

  const token = authHeader.split(' ')[1]

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists.', code: 'ACCOUNT_NOT_FOUND' })
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact SweetCasa support if you believe this is a mistake.',
        code: 'ACCOUNT_SUSPENDED',
      })
    }

    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    req.user = { id: user.id, role: user.role }
    next()
  } catch (err) {
    console.error('[auth] requireRole check failed:', err.message)
    return res.status(500).json({ error: 'Authentication check failed.' })
  }
}

module.exports = requireRole
