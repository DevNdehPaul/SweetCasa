-- Migration: listing lat/lng, nearby-facilities cache, and NearbyFacility table
-- Note: this repo deploys with `prisma db push` (see package.json "start" script),
-- which will apply these changes automatically. Kept here for documentation.

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "nearby_facilities_cache" JSONB;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "nearby_facilities_fetched_at" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "nearby_facilities" (
  "id"         SERIAL PRIMARY KEY,
  "listing_id" INTEGER NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "category"   VARCHAR(50) NOT NULL,
  "latitude"   DOUBLE PRECISION,
  "longitude"  DOUBLE PRECISION,
  "source"     VARCHAR(20) NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_nearby_facilities_listing_id" ON "nearby_facilities"("listing_id");
