-- AlterTable: Make DeviceToken.userId optional (nullable)
-- This allows FCM tokens to represent device installations rather than authenticated sessions.
-- Anonymous/logged-out devices can still receive broadcast and marketing push notifications.

-- Drop the existing foreign key constraint
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_userId_fkey";

-- Make userId nullable
ALTER TABLE "DeviceToken" ALTER COLUMN "userId" DROP NOT NULL;

-- Re-add the foreign key with SET NULL on delete (instead of CASCADE)
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
