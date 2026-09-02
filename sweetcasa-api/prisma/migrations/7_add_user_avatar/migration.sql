-- Add user profile photo storage.
-- The project deploys with `prisma db push`; this migration documents the
-- matching SQL for databases that apply migrations directly.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_public_id" VARCHAR(255);
