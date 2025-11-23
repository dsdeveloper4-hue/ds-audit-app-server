/*
  Warnings:

  - A unique constraint covering the columns `[item_serial_no,audit_id]` on the table `ItemDetails` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."ItemDetails_room_id_item_id_audit_id_key";

-- AlterTable
ALTER TABLE "public"."ItemDetails" ADD COLUMN     "asset_purchase_id" TEXT,
ADD COLUMN     "item_serial_no" TEXT;

-- CreateIndex
CREATE INDEX "ItemDetails_item_serial_no_idx" ON "public"."ItemDetails"("item_serial_no");

-- CreateIndex
CREATE INDEX "ItemDetails_asset_purchase_id_idx" ON "public"."ItemDetails"("asset_purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDetails_item_serial_no_audit_id_key" ON "public"."ItemDetails"("item_serial_no", "audit_id");

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_asset_purchase_id_fkey" FOREIGN KEY ("asset_purchase_id") REFERENCES "public"."AssetPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
