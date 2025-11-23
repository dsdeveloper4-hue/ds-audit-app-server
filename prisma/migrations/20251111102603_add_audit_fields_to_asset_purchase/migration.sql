-- AlterTable
ALTER TABLE "public"."AssetPurchase" ADD COLUMN     "assigned_by_name" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'Active';
