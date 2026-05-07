require('dotenv').config()

const { getPrisma } = require('./src/lib/prisma')
const { ensureDatabaseCompatibility } = require('./src/lib/db-compat')

async function main() {
  const prisma = getPrisma()

  await ensureDatabaseCompatibility()

  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  )
  console.log('\nTables in your database:')
  console.table(tables)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      country: true,
      region: true,
      city: true,
      street: true,
      role: true,
      isVerified: true,
      isSuspended: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  })
  console.log('\nUsers:')
  console.table(users)

  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      city: true,
      region: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  })
  console.log('\nListings:')
  console.table(listings)
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await getPrisma().$disconnect()
  })
