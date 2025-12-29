-- CreateTable
CREATE TABLE "CountryProfile" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "countryName" TEXT NOT NULL,
    "ruler" TEXT NOT NULL,
    "territory" TEXT NOT NULL,
    "population" TEXT NOT NULL,
    "registeredUserId" BIGINT,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryProfile_guildId_idx" ON "CountryProfile"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryProfile_guildId_countryName_key" ON "CountryProfile"("guildId", "countryName");
