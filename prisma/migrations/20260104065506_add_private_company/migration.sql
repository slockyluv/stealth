-- CreateTable
CREATE TABLE "PrivateCompanyDraft" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" TEXT,
    "industryKey" TEXT,
    "industryLabel" TEXT,
    "countryName" TEXT,
    "countryKey" TEXT,
    "continent" "ContinentId",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateCompanyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateCompany" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "industryKey" TEXT NOT NULL,
    "industryLabel" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "countryKey" TEXT NOT NULL,
    "continent" "ContinentId" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateCompanyDraft_guildId_idx" ON "PrivateCompanyDraft"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateCompanyDraft_guildId_userId_key" ON "PrivateCompanyDraft"("guildId", "userId");

-- CreateIndex
CREATE INDEX "PrivateCompany_guildId_countryKey_idx" ON "PrivateCompany"("guildId", "countryKey");

-- CreateIndex
CREATE INDEX "PrivateCompany_guildId_ownerId_idx" ON "PrivateCompany"("guildId", "ownerId");
