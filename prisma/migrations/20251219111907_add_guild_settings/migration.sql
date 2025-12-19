-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" BIGINT NOT NULL,
    "emojiColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);
