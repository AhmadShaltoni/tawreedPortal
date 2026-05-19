-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN_ORDER', 'EARN_WELCOME', 'EARN_REFERRAL_INVITER', 'EARN_REFERRAL_INVITEE', 'EARN_CAMPAIGN', 'REDEEM', 'MANUAL_ADD', 'MANUAL_REMOVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FREE_DELIVERY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignGoalType" AS ENUM ('SPEND_AMOUNT', 'ORDER_COUNT');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LOYALTY_POINTS_EARNED';
ALTER TYPE "NotificationType" ADD VALUE 'LOYALTY_REWARD_REDEEMED';
ALTER TYPE "NotificationType" ADD VALUE 'LOYALTY_CAMPAIGN_COMPLETE';
ALTER TYPE "NotificationType" ADD VALUE 'LOYALTY_REFERRAL_SUCCESS';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyPointsEarned" INTEGER,
ADD COLUMN     "redeemedRewardId" TEXT;

-- CreateTable
CREATE TABLE "LoyaltyConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerJod" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "calculationBase" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "minOrderValue" DOUBLE PRECISION,
    "excludeDeliveryFees" BOOLEAN NOT NULL DEFAULT true,
    "roundingMode" TEXT NOT NULL DEFAULT 'FLOOR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyBalance" (
    "id" TEXT NOT NULL,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LoyaltyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelcomeBonusConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 100,
    "trigger" TEXT NOT NULL DEFAULT 'SIGNUP',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeBonusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inviterPoints" INTEGER NOT NULL DEFAULT 50,
    "inviteePoints" INTEGER NOT NULL DEFAULT 50,
    "trigger" TEXT NOT NULL DEFAULT 'FIRST_DELIVERED_ORDER',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReferral" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referralRewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "inviterRewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "referredByUserId" TEXT,

    CONSTRAINT "UserReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxDiscountCap" DOUBLE PRECISION,
    "minOrderValue" DOUBLE PRECISION,
    "expirationDays" INTEGER NOT NULL DEFAULT 30,
    "usageLimit" INTEGER,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemedReward" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "minOrderValue" DOUBLE PRECISION,
    "maxDiscountCap" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "RedeemedReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "goalType" "CampaignGoalType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCampaignProgress" (
    "id" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "UserCampaignProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT,

    CONSTRAINT "LoyaltyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyBalance_userId_key" ON "LoyaltyBalance"("userId");

-- CreateIndex
CREATE INDEX "LoyaltyBalance_currentBalance_idx" ON "LoyaltyBalance"("currentBalance");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_userId_createdAt_idx" ON "LoyaltyTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_type_idx" ON "LoyaltyTransaction"("type");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_referenceId_idx" ON "LoyaltyTransaction"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReferral_referralCode_key" ON "UserReferral"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserReferral_userId_key" ON "UserReferral"("userId");

-- CreateIndex
CREATE INDEX "UserReferral_referralCode_idx" ON "UserReferral"("referralCode");

-- CreateIndex
CREATE INDEX "UserReferral_referredByUserId_idx" ON "UserReferral"("referredByUserId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_isActive_sortOrder_idx" ON "LoyaltyReward"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LoyaltyReward_pointsCost_idx" ON "LoyaltyReward"("pointsCost");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemedReward_couponCode_key" ON "RedeemedReward"("couponCode");

-- CreateIndex
CREATE INDEX "RedeemedReward_userId_isUsed_idx" ON "RedeemedReward"("userId", "isUsed");

-- CreateIndex
CREATE INDEX "RedeemedReward_couponCode_idx" ON "RedeemedReward"("couponCode");

-- CreateIndex
CREATE INDEX "RedeemedReward_expiresAt_idx" ON "RedeemedReward"("expiresAt");

-- CreateIndex
CREATE INDEX "LoyaltyCampaign_status_isActive_idx" ON "LoyaltyCampaign"("status", "isActive");

-- CreateIndex
CREATE INDEX "LoyaltyCampaign_startDate_endDate_idx" ON "LoyaltyCampaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "UserCampaignProgress_userId_isCompleted_idx" ON "UserCampaignProgress"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "UserCampaignProgress_campaignId_isCompleted_idx" ON "UserCampaignProgress"("campaignId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "UserCampaignProgress_userId_campaignId_key" ON "UserCampaignProgress"("userId", "campaignId");

-- CreateIndex
CREATE INDEX "LoyaltyAuditLog_adminId_createdAt_idx" ON "LoyaltyAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyAuditLog_targetUserId_idx" ON "LoyaltyAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "LoyaltyAuditLog_action_idx" ON "LoyaltyAuditLog"("action");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_redeemedRewardId_fkey" FOREIGN KEY ("redeemedRewardId") REFERENCES "RedeemedReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyBalance" ADD CONSTRAINT "LoyaltyBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedReward" ADD CONSTRAINT "RedeemedReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemedReward" ADD CONSTRAINT "RedeemedReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignProgress" ADD CONSTRAINT "UserCampaignProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignProgress" ADD CONSTRAINT "UserCampaignProgress_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LoyaltyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyAuditLog" ADD CONSTRAINT "LoyaltyAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyAuditLog" ADD CONSTRAINT "LoyaltyAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
