-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "isMobileOnly" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "backgroundColor" SET DEFAULT '#f97316',
ALTER COLUMN "textColor" SET DEFAULT '#FFFFFF';

-- CreateIndex
CREATE INDEX "Notice_isMobileOnly_idx" ON "Notice"("isMobileOnly");
