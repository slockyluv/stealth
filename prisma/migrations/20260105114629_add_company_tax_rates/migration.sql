-- AlterTable
ALTER TABLE "CountryProfile" ADD COLUMN     "foreignCompanyTaxRate" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "residentCompanyTaxRate" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "PrivateCompany" ADD COLUMN     "budget" BIGINT NOT NULL DEFAULT 0;
