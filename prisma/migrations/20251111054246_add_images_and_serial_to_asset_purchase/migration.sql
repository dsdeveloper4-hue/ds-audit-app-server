-- AlterTable
ALTER TABLE "public"."AssetPurchase" ADD COLUMN     "billing_image_url" TEXT,
ADD COLUMN     "item_image_url" TEXT,
ADD COLUMN     "serial_number" TEXT;

-- CreateIndex
CREATE INDEX "AssetPurchase_serial_number_idx" ON "public"."AssetPurchase"("serial_number");
