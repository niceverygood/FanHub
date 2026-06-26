-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'HOST';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HOST';

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_creatorId_fkey";

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "hostId" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "hostId" TEXT,
ALTER COLUMN "creatorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "HostProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_userId_key" ON "HostProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_handle_key" ON "HostProfile"("handle");

-- CreateIndex
CREATE INDEX "CreatorProfile_hostId_idx" ON "CreatorProfile"("hostId");

-- CreateIndex
CREATE INDEX "Payout_hostId_idx" ON "Payout"("hostId");

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostProfile" ADD CONSTRAINT "HostProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "HostProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
