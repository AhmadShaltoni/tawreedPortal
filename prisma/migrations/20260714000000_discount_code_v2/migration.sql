-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN     "allowStacking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedUserId" TEXT,
ADD COLUMN     "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxDiscountCap" DOUBLE PRECISION,
ADD COLUMN     "maxUsagePerUser" INTEGER;

-- CreateTable
CREATE TABLE "_DiscountCodeCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DiscountCodeProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DiscountCodeCategories_AB_unique" ON "_DiscountCodeCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_DiscountCodeCategories_B_index" ON "_DiscountCodeCategories"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DiscountCodeProducts_AB_unique" ON "_DiscountCodeProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_DiscountCodeProducts_B_index" ON "_DiscountCodeProducts"("B");

-- CreateIndex
CREATE INDEX "DiscountCode_allowedUserId_idx" ON "DiscountCode"("allowedUserId");

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_allowedUserId_fkey" FOREIGN KEY ("allowedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeCategories" ADD CONSTRAINT "_DiscountCodeCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeCategories" ADD CONSTRAINT "_DiscountCodeCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeProducts" ADD CONSTRAINT "_DiscountCodeProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeProducts" ADD CONSTRAINT "_DiscountCodeProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: unify legacy single-use flag with the new per-user limit
UPDATE "DiscountCode" SET "maxUsagePerUser" = 1 WHERE "isSingleUse" = true AND "maxUsagePerUser" IS NULL;
