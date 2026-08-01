-- Migration: Add Document Vault (documents table)
-- Note: this repo deploys with `prisma db push` (see package.json "start" script),
-- which will create this table automatically from schema.prisma. This file is kept
-- for documentation/manual-deploy parity with the existing migrations folder.

CREATE TABLE IF NOT EXISTS "documents" (
  "id"                    SERIAL PRIMARY KEY,
  "listing_id"            INTEGER REFERENCES "listings"("id") ON DELETE CASCADE,
  "user_id"               INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "type"                  VARCHAR(50) NOT NULL,
  "file_name"             VARCHAR(255),
  "url"                   TEXT NOT NULL,
  "cloudinary_public_id"  VARCHAR(255),
  "status"                VARCHAR(30) NOT NULL DEFAULT 'Pending',
  "reviewed_by"           INTEGER,
  "review_note"           TEXT,
  "reviewed_at"           TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_documents_listing_id" ON "documents"("listing_id");
CREATE INDEX IF NOT EXISTS "idx_documents_status"     ON "documents"("status");
