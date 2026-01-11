-- CreateTable
CREATE TABLE "GuildMemberDailyStat" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "joins" INTEGER NOT NULL DEFAULT 0,
    "leaves" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMemberDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildMemberDailyStat_guildId_date_idx" ON "GuildMemberDailyStat"("guildId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMemberDailyStat_guildId_date_key" ON "GuildMemberDailyStat"("guildId", "date");
