ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "platform_commission_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "landlord_payout_amount" DECIMAL(12,2);

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "listing_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "transaction_id" INTEGER;
CREATE INDEX IF NOT EXISTS "reports_transaction_id_idx" ON "reports"("transaction_id");
