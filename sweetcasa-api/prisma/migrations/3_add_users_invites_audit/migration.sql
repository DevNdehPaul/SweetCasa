-- Migration: user suspension, listing rejection notes, staff invites, audit log
-- Note: this repo deploys with `prisma db push` (see package.json "start" script),
-- which will apply these changes automatically. Kept here for documentation.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'Active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_by" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT;

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "rejection_note" TEXT;

CREATE TABLE IF NOT EXISTS "staff_invites" (
  "id"          SERIAL PRIMARY KEY,
  "email"       VARCHAR(255) NOT NULL,
  "role"        VARCHAR(20) NOT NULL DEFAULT 'STAFF',
  "token"       TEXT NOT NULL UNIQUE,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "invited_by"  INTEGER,
  "expires_at"  TIMESTAMPTZ NOT NULL,
  "accepted_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"           SERIAL PRIMARY KEY,
  "actor_id"     INTEGER,
  "actor_name"   TEXT,
  "actor_role"   VARCHAR(20),
  "action"       VARCHAR(60) NOT NULL,
  "entity_type"  VARCHAR(40),
  "entity_id"    INTEGER,
  "entity_label" TEXT,
  "metadata"     TEXT,
  "created_at"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_staff_invites_status"  ON "staff_invites"("status");
