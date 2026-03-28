-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "price" REAL NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "payload" JSONB,
    "userId" TEXT,
    "memberId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "resendAvailableAt" DATETIME NOT NULL,
    "attemptsRemaining" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OtpChallenge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "packageId" TEXT NOT NULL,
    "binaryParentId" TEXT,
    "binaryPosition" TEXT,
    "rank" TEXT NOT NULL DEFAULT 'STARTER',
    "councilStatus" TEXT NOT NULL DEFAULT 'NONE',
    "personalVolume" REAL NOT NULL DEFAULT 0,
    "directReferralSales" REAL NOT NULL DEFAULT 0,
    "leftVolume" REAL NOT NULL DEFAULT 0,
    "rightVolume" REAL NOT NULL DEFAULT 0,
    "levelSales" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PackageTier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Member_binaryParentId_fkey" FOREIGN KEY ("binaryParentId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("councilStatus", "createdAt", "directReferralSales", "id", "leftVolume", "levelSales", "name", "packageId", "phoneNumber", "rank", "rightVolume", "updatedAt", "userId") SELECT "councilStatus", "createdAt", "directReferralSales", "id", "leftVolume", "levelSales", "name", "packageId", "phoneNumber", "rank", "rightVolume", "updatedAt", "userId" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
CREATE UNIQUE INDEX "Member_binaryParentId_binaryPosition_key" ON "Member"("binaryParentId", "binaryPosition");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "OtpChallenge_purpose_recipient_createdAt_idx" ON "OtpChallenge"("purpose", "recipient", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_purpose_createdAt_idx" ON "OtpChallenge"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_memberId_purpose_createdAt_idx" ON "OtpChallenge"("memberId", "purpose", "createdAt");

