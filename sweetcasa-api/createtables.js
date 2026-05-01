require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  CREATE TABLE IF NOT EXISTS "BuyerProfile" (
    id TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "SellerProfile" (
    id TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
  );
`)
.then(() => {
  console.log('✅ BuyerProfile and SellerProfile tables created successfully!');
  pool.end();
})
.catch(e => {
  console.error('❌ Error:', e.message);
  pool.end();
});