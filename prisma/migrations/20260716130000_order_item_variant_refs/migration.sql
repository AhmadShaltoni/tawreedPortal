-- AlterTable: add live selection references to OrderItem for the buyer-edit flow
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantOptionId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productUnitId" TEXT;
