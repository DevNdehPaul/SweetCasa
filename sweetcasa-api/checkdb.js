require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // List all tables
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  console.log('\n📋 Tables in your database:');
  console.table(tables);

  // Show all users
  const users = await prisma.user.findMany();
  console.log('\n👥 Users:');
  console.table(users.map(u => ({ id: u.id, email: u.email, role: u.role })));

  // Show all buyer profiles
  const buyers = await prisma.buyerProfile.findMany();
  console.log('\n🏠 Buyer Profiles:');
  console.table(buyers);

  // Show all seller profiles
  const sellers = await prisma.sellerProfile.findMany();
  console.log('\n🏢 Seller Profiles:');
  console.table(sellers);

  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});