-- CreateTable
CREATE TABLE "GuildUserLevel" (
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "xp" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "totalMessageCount" INTEGER NOT NULL DEFAULT 0,
    "totalVoiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastMessageContent" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildUserLevel_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "GuildUserDailyStat" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "bonusGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildUserDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildUserVoiceSession" (
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "channelId" BIGINT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "eligibleSince" TIMESTAMP(3),

    CONSTRAINT "GuildUserVoiceSession_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateIndex
CREATE INDEX "GuildUserLevel_guildId_idx" ON "GuildUserLevel"("guildId");

-- CreateIndex
CREATE INDEX "GuildUserLevel_level_idx" ON "GuildUserLevel"("level");

-- CreateIndex
CREATE INDEX "GuildUserLevel_totalMessageCount_idx" ON "GuildUserLevel"("totalMessageCount");

-- CreateIndex
CREATE INDEX "GuildUserLevel_totalVoiceMinutes_idx" ON "GuildUserLevel"("totalVoiceMinutes");

-- CreateIndex
CREATE INDEX "GuildUserDailyStat_guildId_date_idx" ON "GuildUserDailyStat"("guildId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildUserDailyStat_guildId_userId_date_key" ON "GuildUserDailyStat"("guildId", "userId", "date");

-- CreateIndex
CREATE INDEX "GuildUserVoiceSession_guildId_channelId_idx" ON "GuildUserVoiceSession"("guildId", "channelId");
