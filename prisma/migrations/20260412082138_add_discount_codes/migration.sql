-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "isSingleUse" BOOLEAN NOT NULL DEFAULT false,
    "maxUsage" INTEGER,
    "minOrderAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodeUsage" (
    "id" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "DiscountCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_isActive_idx" ON "DiscountCode"("isActive");

-- CreateIndex
CREATE INDEX "DiscountCodeUsage_discountCodeId_idx" ON "DiscountCodeUsage"("discountCodeId");

-- CreateIndex
CREATE INDEX "DiscountCodeUsage_userId_idx" ON "DiscountCodeUsage"("userId");

-- CreateIndex
CREATE INDEX "DiscountCodeUsage_discountCodeId_userId_idx" ON "DiscountCodeUsage"("discountCodeId", "userId");

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
