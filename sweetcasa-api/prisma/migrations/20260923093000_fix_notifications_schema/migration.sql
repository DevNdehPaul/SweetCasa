-- Notification tables used by src/services/notification.service.js.
-- IF NOT EXISTS keeps this safe where the tables were created manually/previously.
CREATE TABLE IF NOT EXISTS "push_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "platform" VARCHAR(20) NOT NULL DEFAULT 'ios',
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_push_token"
  ON "push_tokens"("user_id", "token");
CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx"
  ON "push_tokens"("user_id");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "sent" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notifications"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx"
  ON "notifications"("user_id", "read");

DO $$ BEGIN
  ALTER TABLE "push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
