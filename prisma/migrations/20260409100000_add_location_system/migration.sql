-- DropIndex
DROP INDEX "CartItem_buyerId_productId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "productUnitId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "piecesPerUnit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitLabel" TEXT,
ADD COLUMN     "unitLabelEn" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "piecesPerUnit" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductUnit_productId_idx" ON "ProductUnit"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_productId_unit_key" ON "ProductUnit"("productId", "unit");

-- CreateIndex
CREATE INDEX "City_sortOrder_idx" ON "City"("sortOrder");

-- CreateIndex
CREATE INDEX "Area_cityId_idx" ON "Area"("cityId");

-- CreateIndex
CREATE INDEX "Area_sortOrder_idx" ON "Area"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_buyerId_productId_productUnitId_key" ON "CartItem"("buyerId", "productId", "productUnitId");

-- CreateIndex
CREATE INDEX "User_cityId_idx" ON "User"("cityId");

-- CreateIndex
CREATE INDEX "User_areaId_idx" ON "User"("areaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
