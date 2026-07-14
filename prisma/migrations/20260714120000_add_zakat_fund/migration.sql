-- CreateTable
CREATE TABLE "ZakatConfig" (
    "id" TEXT NOT NULL,
    "piastresPerItem" INTEGER NOT NULL DEFAULT 1,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZakatConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatPayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "itemsCount" INTEGER NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZakatPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZakatPayment_createdAt_idx" ON "ZakatPayment"("createdAt");
