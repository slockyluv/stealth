-- AlterTable
ALTER TABLE "PrivateCompany" ADD COLUMN     "branchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentSystemInfrastructureMainOfficeBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSystemInfrastructureServerBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSystemLegalNewsDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSystemLegalNewsStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSystemWebDevelopmentOrdered" BOOLEAN NOT NULL DEFAULT false;
