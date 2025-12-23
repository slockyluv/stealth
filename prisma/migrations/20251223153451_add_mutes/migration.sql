-- CreateTable
CREATE TABLE "Mute" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "moderatorId" BIGINT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mute_guildId_expiresAt_idx" ON "Mute"("guildId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_guildId_userId_key" ON "Mute"("guildId", "userId");
