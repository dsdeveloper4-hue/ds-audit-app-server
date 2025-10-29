-- AlterTable
ALTER TABLE "public"."Item" ADD COLUMN     "unit_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."ItemDetails" ADD COLUMN     "total_price" DECIMAL(10,2),
ADD COLUMN     "unit_price" DECIMAL(10,2);
