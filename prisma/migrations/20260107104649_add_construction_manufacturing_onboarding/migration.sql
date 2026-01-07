-- AlterTable
ALTER TABLE "PrivateCompany" ADD COLUMN     "constructionEquipmentMainPurchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "constructionEquipmentSupportPurchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "constructionLegalNewsDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "constructionLegalNewsStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "constructionWebDevelopmentOrdered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingEquipmentMainPurchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingEquipmentSupportPurchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingInfrastructureMainOfficeBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingInfrastructureProductionBuilt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingLegalNewsDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturingLegalNewsStarted" BOOLEAN NOT NULL DEFAULT false;
