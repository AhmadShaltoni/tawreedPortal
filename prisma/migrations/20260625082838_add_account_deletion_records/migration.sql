-- CreateTable
CREATE TABLE "DeletedUserCouponUsage" (
    "id" TEXT NOT NULL,
    "phoneNumberHash" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedUserCouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedAccountRecord" (
    "id" TEXT NOT NULL,
    "phoneNumberHash" TEXT NOT NULL,
    "welcomeBonusReceived" BOOLEAN NOT NULL DEFAULT false,
    "referralInviteeUsed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedAccountRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedUserCouponUsage_phoneNumberHash_idx" ON "DeletedUserCouponUsage"("phoneNumberHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedUserCouponUsage_phoneNumberHash_discountCodeId_key" ON "DeletedUserCouponUsage"("phoneNumberHash", "discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedAccountRecord_phoneNumberHash_key" ON "DeletedAccountRecord"("phoneNumberHash");

-- CreateIndex
CREATE INDEX "DeletedAccountRecord_phoneNumberHash_idx" ON "DeletedAccountRecord"("phoneNumberHash");
