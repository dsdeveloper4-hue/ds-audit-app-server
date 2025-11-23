-- Migration: Add serial number tracking to ItemDetails
-- This allows tracking individual items by serial number instead of aggregating by item name

-- Step 1: Add serial_number and asset_purchase_id columns to ItemDetails
ALTER TABLE "ItemDetails" 
ADD COLUMN "item_serial_no" VARCHAR(255),
ADD COLUMN "asset_purchase_id" VARCHAR(255);

-- Step 2: Create index on serial number for faster lookups
CREATE INDEX "ItemDetails_item_serial_no_idx" ON "ItemDetails"("item_serial_no");
CREATE INDEX "ItemDetails_asset_purchase_id_idx" ON "ItemDetails"("asset_purchase_id");

-- Step 3: Add foreign key constraint to link ItemDetails to AssetPurchase
ALTER TABLE "ItemDetails"
ADD CONSTRAINT "ItemDetails_asset_purchase_id_fkey" 
FOREIGN KEY ("asset_purchase_id") REFERENCES "AssetPurchase"("id") ON DELETE SET NULL;

-- Step 4: Drop the old unique constraint (room_id, item_id, audit_id)
ALTER TABLE "ItemDetails" DROP CONSTRAINT IF EXISTS "ItemDetails_room_id_item_id_audit_id_key";

-- Step 5: Add new unique constraint (item_serial_no, audit_id) - each serial number appears once per audit
-- Note: We allow NULL serial numbers for backward compatibility (old aggregated records)
CREATE UNIQUE INDEX "ItemDetails_item_serial_no_audit_id_key" 
ON "ItemDetails"("item_serial_no", "audit_id") 
WHERE "item_serial_no" IS NOT NULL;

-- Step 6: Update quantity columns to be 1 for serial-tracked items (each record = 1 item)
-- This will be handled by application logic going forward

COMMENT ON COLUMN "ItemDetails"."item_serial_no" IS 'Serial number of the individual item - links to AssetPurchase.serial_number';
COMMENT ON COLUMN "ItemDetails"."asset_purchase_id" IS 'Reference to the AssetPurchase record that created this item';
