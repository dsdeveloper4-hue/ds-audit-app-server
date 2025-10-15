/*
  Warnings:

  - You are about to drop the column `audit_date` on the `Audit` table. All the data in the column will be lost.
  - You are about to drop the column `conducted_by` on the `Audit` table. All the data in the column will be lost.
  - The `status` column on the `Audit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `description` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the `AuditRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditRecordParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AuditStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "public"."Audit" DROP CONSTRAINT "Audit_conducted_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."AuditRecord" DROP CONSTRAINT "AuditRecord_audit_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AuditRecord" DROP CONSTRAINT "AuditRecord_inventory_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AuditRecordParticipant" DROP CONSTRAINT "AuditRecordParticipant_audit_record_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AuditRecordParticipant" DROP CONSTRAINT "AuditRecordParticipant_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_item_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_room_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryHistory" DROP CONSTRAINT "InventoryHistory_inventory_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."InventoryHistory" DROP CONSTRAINT "InventoryHistory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_role_id_fkey";

-- DropIndex
DROP INDEX "public"."Audit_audit_date_idx";

-- AlterTable
ALTER TABLE "public"."Audit" DROP COLUMN "audit_date",
DROP COLUMN "conducted_by",
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AuditStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "public"."Item" ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Room" DROP COLUMN "description";

-- DropTable
DROP TABLE "public"."AuditRecord";

-- DropTable
DROP TABLE "public"."AuditRecordParticipant";

-- DropTable
DROP TABLE "public"."Inventory";

-- DropTable
DROP TABLE "public"."InventoryHistory";

-- CreateTable
CREATE TABLE "public"."ItemDetails" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "active_quantity" INTEGER NOT NULL DEFAULT 0,
    "broken_quantity" INTEGER NOT NULL DEFAULT 0,
    "inactive_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemDetails_room_id_idx" ON "public"."ItemDetails"("room_id");

-- CreateIndex
CREATE INDEX "ItemDetails_item_id_idx" ON "public"."ItemDetails"("item_id");

-- CreateIndex
CREATE INDEX "ItemDetails_audit_id_idx" ON "public"."ItemDetails"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDetails_room_id_item_id_audit_id_key" ON "public"."ItemDetails"("room_id", "item_id", "audit_id");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
