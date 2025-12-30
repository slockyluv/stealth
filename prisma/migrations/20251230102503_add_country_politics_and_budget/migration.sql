-- AlterTable
ALTER TABLE "CountryProfile" ADD COLUMN     "budget" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "governmentForm" TEXT,
ADD COLUMN     "ideology" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "stateStructure" TEXT;
