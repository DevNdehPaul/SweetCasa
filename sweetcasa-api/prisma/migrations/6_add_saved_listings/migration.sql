-- Migration: Add saved listings (favourites) support
-- The SavedListing model is already defined in schema.prisma; this migration
-- documents the table for fresh deployments.
CREATE TABLE IF NOT EXISTS "saved_listings" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "listing_id" INTEGER NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
    "saved_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "unique_user_saved_listing" UNIQUE ("user_id", "listing_id")
);

CREATE INDEX IF NOT EXISTS "idx_saved_listings_user_id" ON "saved_listings"("user_id");