const { getPrisma } = require('./prisma')

async function ensureDatabaseCompatibility() {
  const prisma = getPrisma()

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(50),
      ADD COLUMN IF NOT EXISTS region VARCHAR(50),
      ADD COLUMN IF NOT EXISTS city VARCHAR(50),
      ADD COLUMN IF NOT EXISTS street TEXT;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
      ALTER COLUMN email TYPE VARCHAR(255),
      ALTER COLUMN password TYPE VARCHAR(255),
      ALTER COLUMN avatar TYPE VARCHAR(255);
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

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings
      ADD COLUMN IF NOT EXISTS owner_id INTEGER,
      ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Cameroon',
      ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS toilets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS parlors INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS verandas INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS area_sqm NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS floor_number INTEGER,
      ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20),
      ADD COLUMN IF NOT EXISTS visit_hours VARCHAR(120),
      ADD COLUMN IF NOT EXISTS contact_methods JSONB,
      ADD COLUMN IF NOT EXISTS floor_plan_url TEXT,
      ADD COLUMN IF NOT EXISTS legal_document_urls JSONB;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings
      ALTER COLUMN title TYPE VARCHAR(120),
      ALTER COLUMN price TYPE NUMERIC(12, 2);
  `)

  await prisma.$executeRawUnsafe(`
    UPDATE public.listings
    SET country = 'Cameroon'
    WHERE country IS NULL OR BTRIM(country) = '';
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings
      ALTER COLUMN country SET NOT NULL;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'listings_owner_id_fkey'
      ) THEN
        ALTER TABLE public.listings
          ADD CONSTRAINT listings_owner_id_fkey
          FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.listings_videos
      ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON public.listings (owner_id);
  `)
}

module.exports = { ensureDatabaseCompatibility }
