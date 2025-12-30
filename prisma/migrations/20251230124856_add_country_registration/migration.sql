-- CreateEnum
CREATE TYPE "ContinentId" AS ENUM ('europe', 'asia', 'north_america', 'south_america', 'africa', 'oceania');

-- CreateTable
CREATE TABLE "CountryRegistration" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "countryName" TEXT NOT NULL,
    "countryKey" TEXT NOT NULL,
    "continent" "ContinentId" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryRegistration_guildId_continent_idx" ON "CountryRegistration"("guildId", "continent");

-- CreateIndex
CREATE UNIQUE INDEX "CountryRegistration_guildId_userId_key" ON "CountryRegistration"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryRegistration_guildId_countryKey_key" ON "CountryRegistration"("guildId", "countryKey");
