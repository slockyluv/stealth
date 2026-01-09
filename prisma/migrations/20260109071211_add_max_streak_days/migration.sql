-- AlterTable
ALTER TABLE "GuildUserLevel" ADD COLUMN     "maxStreakDays" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "GuildUserLevel_maxStreakDays_idx" ON "GuildUserLevel"("maxStreakDays");
