ALTER TABLE "users"
  ADD COLUMN "identity_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "identity_verified_at" TIMESTAMP(3),
  ADD COLUMN "identity_match_score" DOUBLE PRECISION;
