-- AlterTable
ALTER TABLE "contact" ADD COLUMN "alertedAt" TIMESTAMP(3);

-- Backfill: contacts that predate the alert sweep are already known —
-- without this they would all post to the channel on the first tick.
UPDATE "contact" SET "alertedAt" = now() WHERE "source" IN ('TRACKING', 'RETELL');

-- CreateIndex
CREATE INDEX "contact_source_alertedAt_idx" ON "contact"("source", "alertedAt");
