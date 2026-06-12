-- CreateEnum
CREATE TYPE "DiscountCampaignScope" AS ENUM ('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'COLLECTION', 'CATEGORY');

-- CreateEnum
CREATE TYPE "DiscountCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'SCHEDULED');

-- CreateTable
CREATE TABLE "DiscountCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "scope" "DiscountCampaignScope" NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "collectionId" TEXT,
    "categoryId" TEXT,
    "status" "DiscountCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCampaignProduct" (
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "DiscountCampaignProduct_pkey" PRIMARY KEY ("campaignId","productId")
);

-- CreateIndex
CREATE INDEX "DiscountCampaign_status_startDate_endDate_idx" ON "DiscountCampaign"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "DiscountCampaign_scope_idx" ON "DiscountCampaign"("scope");

-- CreateIndex
CREATE INDEX "DiscountCampaign_collectionId_idx" ON "DiscountCampaign"("collectionId");

-- CreateIndex
CREATE INDEX "DiscountCampaign_categoryId_idx" ON "DiscountCampaign"("categoryId");

-- CreateIndex
CREATE INDEX "DiscountCampaignProduct_productId_idx" ON "DiscountCampaignProduct"("productId");

-- AddForeignKey
ALTER TABLE "DiscountCampaign" ADD CONSTRAINT "DiscountCampaign_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCampaign" ADD CONSTRAINT "DiscountCampaign_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCampaignProduct" ADD CONSTRAINT "DiscountCampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DiscountCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCampaignProduct" ADD CONSTRAINT "DiscountCampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
