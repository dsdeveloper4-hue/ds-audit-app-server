-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."AuditStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "department" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Audit" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "public"."AuditStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."AuditHistory" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "item_id" TEXT,
    "room_id" TEXT,
    "user_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AuditParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AuditParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "public"."User"("mobile");

-- CreateIndex
CREATE INDEX "Room_name_idx" ON "public"."Room"("name");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "public"."Item"("name");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "public"."Item"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_month_year_key" ON "public"."Audit"("month", "year");

-- CreateIndex
CREATE INDEX "ItemDetails_room_id_idx" ON "public"."ItemDetails"("room_id");

-- CreateIndex
CREATE INDEX "ItemDetails_item_id_idx" ON "public"."ItemDetails"("item_id");

-- CreateIndex
CREATE INDEX "ItemDetails_audit_id_idx" ON "public"."ItemDetails"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDetails_room_id_item_id_audit_id_key" ON "public"."ItemDetails"("room_id", "item_id", "audit_id");

-- CreateIndex
CREATE INDEX "_AuditParticipants_B_index" ON "public"."_AuditParticipants"("B");

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditHistory" ADD CONSTRAINT "AuditHistory_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditHistory" ADD CONSTRAINT "AuditHistory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditHistory" ADD CONSTRAINT "AuditHistory_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditHistory" ADD CONSTRAINT "AuditHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AuditParticipants" ADD CONSTRAINT "_AuditParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AuditParticipants" ADD CONSTRAINT "_AuditParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
