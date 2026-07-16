-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "vendorName" TEXT NOT NULL,
    "amount" REAL,
    "currency" TEXT,
    "renewalDate" DATETIME,
    "cancelByDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceRawText" TEXT,
    "confidence" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Item_renewalDate_idx" ON "Item"("renewalDate");

-- CreateIndex
CREATE INDEX "Item_cancelByDate_idx" ON "Item"("cancelByDate");
