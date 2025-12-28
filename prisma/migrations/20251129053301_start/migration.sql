-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."AuditStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ');

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPermission" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_id" TEXT,
    "profile_image" TEXT,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "auth_provider" TEXT NOT NULL DEFAULT 'google',
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "office_name" TEXT,
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
    "sub_category" TEXT,
    "unit" TEXT,
    "unit_price" DECIMAL(10,2),
    "image_url" TEXT,
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
    "reduction_percentage" DECIMAL(5,2) DEFAULT 0.00,
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
    "item_serial_no" TEXT,
    "asset_purchase_id" TEXT,
    "active_quantity" INTEGER NOT NULL DEFAULT 0,
    "broken_quantity" INTEGER NOT NULL DEFAULT 0,
    "inactive_quantity" INTEGER NOT NULL DEFAULT 0,
    "lost_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2),
    "total_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssetPurchase" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "item_image_url" TEXT,
    "billing_image_url" TEXT,
    "assigned_by_name" TEXT,
    "status" TEXT DEFAULT 'Active',
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecentActivityHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity_type" TEXT NOT NULL,
    "entity_name" TEXT,
    "entity_id" TEXT,
    "action_type" "public"."ActivityType" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "change_summary" JSONB,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentActivityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AuditParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AuditParticipants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "public"."Permission"("category");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "public"."RolePermission"("role");

-- CreateIndex
CREATE INDEX "RolePermission_permission_id_idx" ON "public"."RolePermission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_id_key" ON "public"."RolePermission"("role", "permission_id");

-- CreateIndex
CREATE INDEX "UserPermission_user_id_idx" ON "public"."UserPermission"("user_id");

-- CreateIndex
CREATE INDEX "UserPermission_permission_id_idx" ON "public"."UserPermission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_user_id_permission_id_key" ON "public"."UserPermission"("user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "public"."User"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_reset_token_key" ON "public"."User"("reset_token");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_google_id_idx" ON "public"."User"("google_id");

-- CreateIndex
CREATE INDEX "User_reset_token_idx" ON "public"."User"("reset_token");

-- CreateIndex
CREATE INDEX "Room_name_idx" ON "public"."Room"("name");

-- CreateIndex
CREATE INDEX "Room_office_name_idx" ON "public"."Room"("office_name");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "public"."Item"("name");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "public"."Item"("category");

-- CreateIndex
CREATE INDEX "Item_sub_category_idx" ON "public"."Item"("sub_category");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_month_year_key" ON "public"."Audit"("month", "year");

-- CreateIndex
CREATE INDEX "ItemDetails_room_id_idx" ON "public"."ItemDetails"("room_id");

-- CreateIndex
CREATE INDEX "ItemDetails_item_id_idx" ON "public"."ItemDetails"("item_id");

-- CreateIndex
CREATE INDEX "ItemDetails_audit_id_idx" ON "public"."ItemDetails"("audit_id");

-- CreateIndex
CREATE INDEX "ItemDetails_item_serial_no_idx" ON "public"."ItemDetails"("item_serial_no");

-- CreateIndex
CREATE INDEX "ItemDetails_asset_purchase_id_idx" ON "public"."ItemDetails"("asset_purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDetails_item_serial_no_audit_id_key" ON "public"."ItemDetails"("item_serial_no", "audit_id");

-- CreateIndex
CREATE INDEX "AssetPurchase_room_id_idx" ON "public"."AssetPurchase"("room_id");

-- CreateIndex
CREATE INDEX "AssetPurchase_item_id_idx" ON "public"."AssetPurchase"("item_id");

-- CreateIndex
CREATE INDEX "AssetPurchase_purchase_date_idx" ON "public"."AssetPurchase"("purchase_date");

-- CreateIndex
CREATE INDEX "AssetPurchase_added_by_idx" ON "public"."AssetPurchase"("added_by");

-- CreateIndex
CREATE INDEX "AssetPurchase_serial_number_idx" ON "public"."AssetPurchase"("serial_number");

-- CreateIndex
CREATE INDEX "RecentActivityHistory_entity_type_entity_id_idx" ON "public"."RecentActivityHistory"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "RecentActivityHistory_user_id_occurred_at_idx" ON "public"."RecentActivityHistory"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "RecentActivityHistory_occurred_at_idx" ON "public"."RecentActivityHistory"("occurred_at");

-- CreateIndex
CREATE INDEX "_AuditParticipants_B_index" ON "public"."_AuditParticipants"("B");

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemDetails" ADD CONSTRAINT "ItemDetails_asset_purchase_id_fkey" FOREIGN KEY ("asset_purchase_id") REFERENCES "public"."AssetPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecentActivityHistory" ADD CONSTRAINT "RecentActivityHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AuditParticipants" ADD CONSTRAINT "_AuditParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AuditParticipants" ADD CONSTRAINT "_AuditParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
