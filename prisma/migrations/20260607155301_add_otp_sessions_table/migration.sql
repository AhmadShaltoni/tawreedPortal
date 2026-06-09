-- CreateTable
CREATE TABLE "OtpSession" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "OtpSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRateLimit" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequest" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpSession_phone_status_idx" ON "OtpSession"("phone", "status");

-- CreateIndex
CREATE INDEX "OtpSession_expiresAt_idx" ON "OtpSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OtpSession_phone_status_key" ON "OtpSession"("phone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OtpRateLimit_phone_key" ON "OtpRateLimit"("phone");

-- CreateIndex
CREATE INDEX "OtpRateLimit_phone_idx" ON "OtpRateLimit"("phone");
