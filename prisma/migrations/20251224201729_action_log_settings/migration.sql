-- CreateTable
CREATE TABLE "ActionLogSetting" (
    "guildId" BIGINT NOT NULL,
    "moderationChannelId" BIGINT,
    "moderationUpdatedBy" BIGINT,
    "rolesChannelId" BIGINT,
    "rolesUpdatedBy" BIGINT,
    "messagesChannelId" BIGINT,
    "messagesUpdatedBy" BIGINT,
    "trafficChannelId" BIGINT,
    "trafficUpdatedBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionLogSetting_pkey" PRIMARY KEY ("guildId")
);
