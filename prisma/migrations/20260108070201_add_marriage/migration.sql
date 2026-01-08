-- CreateTable
CREATE TABLE "Marriage" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userIdA" BIGINT NOT NULL,
    "userIdB" BIGINT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysTogether" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Marriage_guildId_userIdA_idx" ON "Marriage"("guildId", "userIdA");

-- CreateIndex
CREATE INDEX "Marriage_guildId_userIdB_idx" ON "Marriage"("guildId", "userIdB");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_guildId_userIdA_userIdB_key" ON "Marriage"("guildId", "userIdA", "userIdB");
