-- Migration: Escrow Wallet (wallets, transactions)
-- Note: this repo deploys with `prisma db push` (see package.json "start" script),
-- which will apply these changes automatically. Kept here for documentation.

CREATE TABLE IF NOT EXISTS "wallets" (
  "id"                SERIAL PRIMARY KEY,
  "user_id"           INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "held_balance"      NUMERIC(12,2) NOT NULL DEFAULT 0,
  "available_balance" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMPTZ DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id"                     SERIAL PRIMARY KEY,
  "wallet_id"              INTEGER NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
  "type"                   VARCHAR(20) NOT NULL,
  "status"                 VARCHAR(20) NOT NULL DEFAULT 'Pending',
  "amount"                 NUMERIC(12,2) NOT NULL,
  "fee_amount"             NUMERIC(12,2),
  "listing_id"             INTEGER REFERENCES "listings"("id") ON DELETE SET NULL,
  "related_transaction_id" INTEGER,
  "phone"                  VARCHAR(20),
  "medium"                 VARCHAR(20),
  "fapshi_trans_id"        TEXT,
  "fapshi_status"          VARCHAR(20),
  "reason"                 TEXT,
  "initiated_by"           INTEGER,
  "created_at"             TIMESTAMPTZ DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_transactions_wallet_id"  ON "transactions"("wallet_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_listing_id" ON "transactions"("listing_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_status"     ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "idx_transactions_fapshi_id"  ON "transactions"("fapshi_trans_id");
