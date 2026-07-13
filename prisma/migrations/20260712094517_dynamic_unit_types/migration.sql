-- Convert enum columns to TEXT in place (preserves existing data and indexes)
ALTER TABLE "OrderItem" ALTER COLUMN "unit" TYPE TEXT USING "unit"::text;
ALTER TABLE "ProductUnit" ALTER COLUMN "unit" TYPE TEXT USING "unit"::text;

-- CreateTable
CREATE TABLE "UnitType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "defaultPieces" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_code_key" ON "UnitType"("code");

-- CreateIndex
CREATE INDEX "UnitType_isActive_idx" ON "UnitType"("isActive");

-- Seed default unit types (matching the previously hardcoded dropdown options)
INSERT INTO "UnitType" ("id", "code", "name", "nameEn", "defaultPieces", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  ('ut_piece',  'PIECE',  'حبة',    'Piece',    1,  true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_dozen',  'DOZEN',  'دزينة',  'Dozen',    12, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_carton', 'CARTON', 'كرتونة', 'Carton',   1,  true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_box',    'BOX',    'صندوق',  'Box',      1,  true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_pack',   'PACK',   'عبوة',   'Pack',     1,  true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_kg',     'KG',     'كيلو',   'Kilogram', 1,  true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_gram',   'GRAM',   'جرام',   'Gram',     1,  true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_liter',  'LITER',  'لتر',    'Liter',    1,  true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ut_pallet', 'PALLET', 'طبلية',  'Pallet',   1,  true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
