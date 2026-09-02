const { getPrisma } = require('./prisma')

async function tableExists(prisma, tableName) {
  const result = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ) AS exists
  `)
  return result[0].exists
}

async function ensureDatabaseCompatibility() {
  const prisma = getPrisma()

  const usersExist = await tableExists(prisma, 'users')
  const listingsExist = await tableExists(prisma, 'listings')
  const listingsVideosExist = await tableExists(prisma, 'listings_videos')

  if (!usersExist || !listingsExist) {
    console.log('Tables not yet created — skipping compatibility updates.')
    return
  }

  // ── Users ────────────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS company_name      VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country           VARCHAR(50),
      ADD COLUMN IF NOT EXISTS region            VARCHAR(50),
      ADD COLUMN IF NOT EXISTS city              VARCHAR(50),
      ADD COLUMN IF NOT EXISTS street            TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
      ADD COLUMN IF NOT EXISTS avatar_public_id  VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_token   TEXT,
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
      ALTER COLUMN email    TYPE VARCHAR(255),
      ALTER COLUMN password TYPE VARCHAR(255),
      ALTER COLUMN name     TYPE VARCHAR(100);
  `)

  await prisma.$executeRawUnsafe(`
    UPDATE public.users
    SET company_name = name
    WHERE role = 'SELLER'
      AND (company_name IS NULL OR BTRIM(company_name) = '');
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
  `)

  // ── Listings ─────────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings
      ADD COLUMN IF NOT EXISTS owner_id            INTEGER,
      ADD COLUMN IF NOT EXISTS country             VARCHAR(50) DEFAULT 'Cameroon',
      ADD COLUMN IF NOT EXISTS neighborhood        VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bedrooms            INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bathrooms           INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS toilets             INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS parlors             INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS verandas            INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS area_sqm            NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS floor_number        INTEGER,
      ADD COLUMN IF NOT EXISTS payment_frequency   VARCHAR(20),
      ADD COLUMN IF NOT EXISTS visit_hours         VARCHAR(120),
      ADD COLUMN IF NOT EXISTS contact_methods     JSONB,
      ADD COLUMN IF NOT EXISTS floor_plan_url      TEXT,
      ADD COLUMN IF NOT EXISTS legal_document_urls JSONB;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings
      ALTER COLUMN title TYPE VARCHAR(120),
      ALTER COLUMN price TYPE NUMERIC(12,2);
  `)

  await prisma.$executeRawUnsafe(`
    UPDATE public.listings
    SET country = 'Cameroon'
    WHERE country IS NULL OR BTRIM(country) = '';
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_owner_id_fkey'
      ) THEN
        ALTER TABLE public.listings
          ADD CONSTRAINT listings_owner_id_fkey
          FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON public.listings (owner_id);
  `)

  // ── Listings Videos ───────────────────────────────────────────────────────
  if (listingsVideosExist) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.listings_videos
        ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);
    `)
  }

  // ── Saved Listings (Favourites) ───────────────────────────────────────────
  // Table already exists on fresh installs via Prisma migrations; this ensures
  // it also exists on the legacy production database without a migration run.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.saved_listings (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
      saved_at   TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_user_saved_listing UNIQUE (user_id, listing_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON public.saved_listings (user_id);
  `)

  console.log('Database compatibility updates applied successfully.')
}

module.exports = { ensureDatabaseCompatibility }
