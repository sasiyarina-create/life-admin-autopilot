ALTER TABLE "GmailConnection" ADD COLUMN "lastScanned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GmailConnection" ADD COLUMN "lastRelevant" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GmailConnection" ADD COLUMN "lastDuplicates" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GmailConnection" ADD COLUMN "lastIgnored" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PendingImport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gmailMessageId" TEXT NOT NULL,
  "sender" TEXT,
  "subject" TEXT,
  "preview" TEXT NOT NULL,
  "vendor" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" REAL,
  "currency" TEXT,
  "renewalDate" DATETIME,
  "cancelByDate" DATETIME,
  "confidence" REAL NOT NULL,
  "confidenceReasons" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PendingImport_gmailMessageId_key" ON "PendingImport"("gmailMessageId");
CREATE INDEX "PendingImport_status_idx" ON "PendingImport"("status");
CREATE INDEX "PendingImport_type_idx" ON "PendingImport"("type");
CREATE INDEX "PendingImport_confidence_idx" ON "PendingImport"("confidence");
