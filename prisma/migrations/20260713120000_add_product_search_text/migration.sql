-- Arabic-aware product search: normalized searchText column + trigram fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "keywords" TEXT,
ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Product_searchText_idx" ON "Product" USING GIN ("searchText" gin_trgm_ops);
