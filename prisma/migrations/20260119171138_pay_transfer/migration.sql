-- CreateTable
CREATE TABLE "PayTransferDraft" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "recipientUserId" BIGINT,
    "amount" BIGINT,
    "paymentSystemCompanyId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayTransferDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayTransfer" (
    "id" BIGSERIAL NOT NULL,
    "guildId" BIGINT NOT NULL,
    "senderUserId" BIGINT NOT NULL,
    "recipientUserId" BIGINT NOT NULL,
    "senderEntityType" TEXT NOT NULL,
    "recipientEntityType" TEXT NOT NULL,
    "senderCompanyId" BIGINT,
    "recipientCompanyId" BIGINT,
    "senderCountryKey" TEXT NOT NULL,
    "recipientCountryKey" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "feeRate" INTEGER NOT NULL,
    "feeAmount" BIGINT NOT NULL,
    "receivedAmount" BIGINT NOT NULL,
    "method" TEXT NOT NULL,
    "paymentSystemCompanyId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayTransferDraft_guildId_idx" ON "PayTransferDraft"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PayTransferDraft_guildId_userId_key" ON "PayTransferDraft"("guildId", "userId");

-- CreateIndex
CREATE INDEX "PayTransfer_guildId_senderUserId_idx" ON "PayTransfer"("guildId", "senderUserId");

-- CreateIndex
CREATE INDEX "PayTransfer_guildId_recipientUserId_idx" ON "PayTransfer"("guildId", "recipientUserId");
