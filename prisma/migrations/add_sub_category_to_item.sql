-- Add sub_category column to Item table
ALTER TABLE "Item" ADD COLUMN "sub_category" TEXT;

-- Create index for sub_category for better query performance
CREATE INDEX "Item_sub_category_idx" ON "Item"("sub_category");
