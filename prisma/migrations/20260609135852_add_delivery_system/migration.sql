-- CreateEnum
CREATE TYPE "DeliveryPromotionType" AS ENUM ('FREE_DELIVERY', 'REDUCED_FEE', 'FLAT_RATE');

-- CreateEnum
CREATE TYPE "DeliveryScope" AS ENUM ('ALL_CITIES', 'SPECIFIC_CITIES');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryAreaId" TEXT,
ADD COLUMN     "deliveryCityId" TEXT,
ADD COLUMN     "deliveryPromotionId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultFee" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "freeDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "freeDeliveryScope" "DeliveryScope" NOT NULL DEFAULT 'ALL_CITIES',
    "minOrderAmount" DOUBLE PRECISION,
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "freeDeliveryEnabled" BOOLEAN,
    "estimatedDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPromotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" "DeliveryPromotionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scope" "DeliveryScope" NOT NULL DEFAULT 'ALL_CITIES',
    "cityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minOrderAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_cityId_key" ON "DeliveryZone"("cityId");

-- CreateIndex
CREATE INDEX "DeliveryZone_isActive_isVisible_idx" ON "DeliveryZone"("isActive", "isVisible");

-- CreateIndex
CREATE INDEX "DeliveryZone_sortOrder_idx" ON "DeliveryZone"("sortOrder");

-- CreateIndex
CREATE INDEX "DeliveryPromotion_isActive_startDate_endDate_idx" ON "DeliveryPromotion"("isActive", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPromotionId_fkey" FOREIGN KEY ("deliveryPromotionId") REFERENCES "DeliveryPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
