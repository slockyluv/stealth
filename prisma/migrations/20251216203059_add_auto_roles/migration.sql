-- CreateTable
CREATE TABLE "AutoRole" (
    "id" BIGSERIAL PRIMARY KEY,
    "guildId" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoRole_guildId_roleId_key" ON "AutoRole"("guildId", "roleId");
CREATE INDEX "AutoRole_guildId_idx" ON "AutoRole"("guildId");