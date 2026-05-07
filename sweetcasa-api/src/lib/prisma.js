let prisma = null

function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })
  }

  return prisma
}

module.exports = { getPrisma }
