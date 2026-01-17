-- CreateTable
CREATE TABLE "CompanyActivityCountry" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "companyId" BIGINT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyIndustryKey" TEXT NOT NULL,
    "companyIndustryLabel" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "countryKey" TEXT NOT NULL,
    "continent" "ContinentId" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyActivityCountry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyActivityCountry_guildId_countryKey_idx" ON "CompanyActivityCountry"("guildId", "countryKey");

-- CreateIndex
CREATE INDEX "CompanyActivityCountry_guildId_companyId_idx" ON "CompanyActivityCountry"("guildId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyActivityCountry_guildId_companyId_countryKey_key" ON "CompanyActivityCountry"("guildId", "companyId", "countryKey");
