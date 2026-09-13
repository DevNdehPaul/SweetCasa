CREATE TABLE "viewing_requests" (
  "id" SERIAL NOT NULL,
  "listing_id" INTEGER NOT NULL,
  "requester_id" INTEGER NOT NULL,
  "agent_id" INTEGER NOT NULL,
  "preferred_date" DATE NOT NULL,
  "preferred_time" VARCHAR(5) NOT NULL,
  "note" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "agent_message" TEXT,
  "confirmed_date" DATE,
  "confirmed_time" VARCHAR(5),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "viewing_requests_listing_id_idx" ON "viewing_requests"("listing_id");
CREATE INDEX "viewing_requests_requester_id_status_idx" ON "viewing_requests"("requester_id", "status");
CREATE INDEX "viewing_requests_agent_id_status_idx" ON "viewing_requests"("agent_id", "status");
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
