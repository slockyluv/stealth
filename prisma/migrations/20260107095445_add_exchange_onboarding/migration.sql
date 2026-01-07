-- AlterTable
ALTER TABLE "PrivateCompany" ADD COLUMN     "cryptoExchangeInfrastructureMainOfficeBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cryptoExchangeInfrastructureServerBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cryptoExchangeLegalNewsDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cryptoExchangeLegalNewsStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cryptoExchangeWebDevelopmentOrdered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "investmentExchangeInfrastructureMainOfficeBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "investmentExchangeInfrastructureServerBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "investmentExchangeLegalNewsDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "investmentExchangeLegalNewsStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "investmentExchangeWebDevelopmentOrdered" BOOLEAN NOT NULL DEFAULT false;
