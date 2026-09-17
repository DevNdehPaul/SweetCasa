ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "rent_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "caution_fee_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "signature_name" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "signed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "move_in_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "protection_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolution_key" VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_resolution_key_key" ON "transactions"("resolution_key");

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "transaction_id" INTEGER;
