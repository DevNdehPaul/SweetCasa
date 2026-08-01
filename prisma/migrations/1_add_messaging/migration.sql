-- Migration: Add messaging support (Conversation + Message tables)

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"          SERIAL PRIMARY KEY,
  "listing_id"  INTEGER REFERENCES "listings"("id") ON DELETE SET NULL,
  "buyer_id"    INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "seller_id"   INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMPTZ DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "unique_conversation" UNIQUE ("listing_id", "buyer_id", "seller_id")
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id"              SERIAL PRIMARY KEY,
  "conversation_id" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id"       INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text"            TEXT NOT NULL,
  "seen"            BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_buyer_id"   ON "conversations"("buyer_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_seller_id"  ON "conversations"("seller_id");
