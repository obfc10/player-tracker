-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "hasLeftRealm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "leftRealmAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Player_hasLeftRealm_idx" ON "Player"("hasLeftRealm");

-- CreateIndex
CREATE INDEX "Player_lastSeenAt_idx" ON "Player"("lastSeenAt");