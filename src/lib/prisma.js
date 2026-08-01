const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

let prisma = null

function getPrisma() {
  if (!prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,                // max 5 connections in the pool
      idleTimeoutMillis: 30000,   // close idle connections after 30s
      connectionTimeoutMillis: 10000, // fail fast if can't connect in 10s
      ssl: { rejectUnauthorized: false }, // required for Railway PostgreSQL
    })

    const adapter = new PrismaPg(pool)

    prisma = new PrismaClient({
      adapter,
      log: ['error'],
    })
  }

  return prisma
}

module.exports = { getPrisma }