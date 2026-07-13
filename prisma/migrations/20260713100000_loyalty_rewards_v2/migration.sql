-- AlterEnum
ALTER TYPE "RewardType" ADD VALUE 'FREE_PRODUCT';

-- AlterTable
ALTER TABLE "LoyaltyConfig" ADD COLUMN     "earnTrigger" TEXT NOT NULL DEFAULT 'ORDER_PLACED';

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "isReward" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RedeemedReward" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "productNameEn" TEXT;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

