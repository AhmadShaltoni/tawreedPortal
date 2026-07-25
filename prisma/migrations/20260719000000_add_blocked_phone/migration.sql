-- CreateTable
CREATE TABLE "BlockedPhone" (
    "id" TEXT NOT NULL,
    "phoneNumberHash" TEXT NOT NULL,
    "phoneMasked" TEXT,
    "reason" TEXT,
    "blockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedPhone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPhone_phoneNumberHash_key" ON "BlockedPhone"("phoneNumberHash");

-- CreateIndex
CREATE INDEX "BlockedPhone_phoneNumberHash_idx" ON "BlockedPhone"("phoneNumberHash");
