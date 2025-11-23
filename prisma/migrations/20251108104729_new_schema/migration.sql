-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "sub_category" TEXT;

-- CreateIndex
CREATE INDEX "Item_sub_category_idx" ON "public"."Item"("sub_category");
