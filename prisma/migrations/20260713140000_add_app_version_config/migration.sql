-- CreateTable
CREATE TABLE "AppVersionConfig" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "minVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "latestVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "storeUrl" TEXT NOT NULL DEFAULT '',
    "message" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppVersionConfig_platform_key" ON "AppVersionConfig"("platform");
