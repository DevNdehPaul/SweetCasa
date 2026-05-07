require('dotenv').config()

const { getPrisma } = require('./src/lib/prisma')
const { ensureDatabaseCompatibility } = require('./src/lib/db-compat')

async function main() {
  const prisma = getPrisma()

  await ensureDatabaseCompatibility()

  const requiredTables = [
    'users',
    'listings',
    'listings_images',
    'listings_videos',
    'saved_listings',
    'casamatch_history',
  ]

  const existingTables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `)

  const existingTableNames = new Set(existingTables.map((table) => table.table_name))
  const missingTables = requiredTables.filter((table) => !existingTableNames.has(table))

  if (missingTables.length) {
    throw new Error(
      `Database is missing tables from tryer2.sql: ${missingTables.join(', ')}`
    )
  }

  console.log('Database matches the tables required by tryer2.sql.')
  console.log('Compatibility updates for Prisma/auth have been applied.')
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await getPrisma().$disconnect()
  })
