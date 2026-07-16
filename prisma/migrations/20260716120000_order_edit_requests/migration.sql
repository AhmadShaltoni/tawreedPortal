-- CreateEnum
CREATE TYPE "OrderEditStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OrderEditRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderEditStatus" NOT NULL DEFAULT 'PENDING',
    "proposedItems" JSONB NOT NULL,
    "proposedDeliveryAddress" TEXT,
    "proposedDeliveryAddressDetails" TEXT,
    "proposedDeliveryCity" TEXT,
    "proposedDeliveryCityId" TEXT,
    "proposedDeliveryAreaId" TEXT,
    "proposedBuyerNotes" TEXT,
    "diff" JSONB NOT NULL,
    "estimatedTotal" DOUBLE PRECISION,
    "estimatedDeliveryFee" DOUBLE PRECISION,
    "buyerMessage" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "OrderEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderEditRequest_orderId_idx" ON "OrderEditRequest"("orderId");

-- CreateIndex
CREATE INDEX "OrderEditRequest_status_idx" ON "OrderEditRequest"("status");

-- AddForeignKey
ALTER TABLE "OrderEditRequest" ADD CONSTRAINT "OrderEditRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
