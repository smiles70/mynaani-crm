-- AlterEnum
ALTER TYPE "RecordSource" ADD VALUE 'RETELL';

-- CreateTable
CREATE TABLE "retellEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "contactId" TEXT,
    "payload" JSONB NOT NULL,
    "filedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retellEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retellEvent_eventKey_key" ON "retellEvent"("eventKey");

-- CreateIndex
CREATE INDEX "retellEvent_contactId_idx" ON "retellEvent"("contactId");

-- CreateIndex
CREATE INDEX "retellEvent_createdAt_idx" ON "retellEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "retellEvent" ADD CONSTRAINT "retellEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
