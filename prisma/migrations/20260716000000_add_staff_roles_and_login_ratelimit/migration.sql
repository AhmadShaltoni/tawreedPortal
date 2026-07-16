-- Add staff roles (additive; PG 12+ allows ADD VALUE inside the migration
-- transaction as long as the value is not used in the same transaction).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DELIVERY';

-- Per-staff dashboard permission keys.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Failed-login throttle table.
CREATE TABLE IF NOT EXISTS "LoginRateLimit" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoginRateLimit_identifier_key" ON "LoginRateLimit"("identifier");
CREATE INDEX IF NOT EXISTS "LoginRateLimit_identifier_idx" ON "LoginRateLimit"("identifier");
