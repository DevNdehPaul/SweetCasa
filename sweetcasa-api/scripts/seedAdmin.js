// One-time script to create the first ADMIN user.
// The public /auth/register endpoint only allows BUYER/SELLER roles and requires
// a National ID upload, so admins are created directly against the database instead.
//
// Usage:
//   node scripts/seedAdmin.js "admin@sweetcasa.com" "a-strong-password" "Admin Name"
//
// Run this from the sweetcasa-api directory, with DATABASE_URL set in the environment
// (e.g. via `.env`, or prefix the command with `railway run` in production).

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getPrisma } = require('../src/lib/prisma')

async function main() {
  const [, , email, password, name] = process.argv

  if (!email || !password) {
    console.error('Usage: node scripts/seedAdmin.js <email> <password> [name]')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const prisma = getPrisma()
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } })
  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log(`Admin already exists for ${normalizedEmail} (id ${existing.id}). Nothing to do.`)
    } else {
      console.error(
        `A user with email ${normalizedEmail} already exists with role ${existing.role}. ` +
        `Refusing to overwrite — use a different email or update the role manually.`
      )
    }
    process.exit(existing.role === 'ADMIN' ? 0 : 1)
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const admin = await prisma.user.create({
    data: {
      name: name || 'SweetCasa Admin',
      email: normalizedEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log(`Created admin user: ${admin.email} (id ${admin.id})`)
  console.log('You can now log in at the admin dashboard with this email/password.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed to seed admin:', err)
  process.exit(1)
})
