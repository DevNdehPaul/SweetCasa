const jwt = require('jsonwebtoken')
const { updateProfile } = require('../controllers/auth.controller') // or wherever you put it
const requireAuth = require('../middleware/requireAuth') // your JWT auth middleware
// PUT /auth/profile — update logged-in user's profile
router.put('/profile', requireAuth, updateProfile)
const requireRole = (...roles) => (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided.' })

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded

    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: 'Access denied.' })

    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

module.exports = requireRole