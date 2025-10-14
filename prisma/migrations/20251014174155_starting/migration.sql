-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
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
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inventory" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "active_quantity" INTEGER NOT NULL DEFAULT 0,
    "broken_quantity" INTEGER NOT NULL DEFAULT 0,
    "inactive_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Audit" (
    "id" TEXT NOT NULL,
    "audit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "notes" TEXT,
    "conducted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditRecord" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "recorded_current" INTEGER NOT NULL DEFAULT 0,
    "recorded_active" INTEGER NOT NULL DEFAULT 0,
    "recorded_broken" INTEGER NOT NULL DEFAULT 0,
    "recorded_inactive" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditRecordParticipant" (
    "id" TEXT NOT NULL,
    "audit_record_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRecordParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryHistory" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "field_changed" TEXT NOT NULL,
    "previous_value" INTEGER NOT NULL,
    "new_value" INTEGER NOT NULL,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "public"."User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "public"."Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON "public"."RolePermission"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "Room_name_idx" ON "public"."Room"("name");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "public"."Item"("name");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "public"."Item"("category");

-- CreateIndex
CREATE INDEX "Inventory_room_id_idx" ON "public"."Inventory"("room_id");

-- CreateIndex
CREATE INDEX "Inventory_item_id_idx" ON "public"."Inventory"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_room_id_item_id_key" ON "public"."Inventory"("room_id", "item_id");

-- CreateIndex
CREATE INDEX "Audit_audit_date_idx" ON "public"."Audit"("audit_date");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_month_year_key" ON "public"."Audit"("month", "year");

-- CreateIndex
CREATE INDEX "AuditRecord_audit_id_idx" ON "public"."AuditRecord"("audit_id");

-- CreateIndex
CREATE INDEX "AuditRecord_inventory_id_idx" ON "public"."AuditRecord"("inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecord_audit_id_inventory_id_key" ON "public"."AuditRecord"("audit_id", "inventory_id");

-- CreateIndex
CREATE INDEX "AuditRecordParticipant_user_id_idx" ON "public"."AuditRecordParticipant"("user_id");

-- CreateIndex
CREATE INDEX "AuditRecordParticipant_audit_record_id_idx" ON "public"."AuditRecordParticipant"("audit_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRecordParticipant_audit_record_id_user_id_key" ON "public"."AuditRecordParticipant"("audit_record_id", "user_id");

-- CreateIndex
CREATE INDEX "InventoryHistory_inventory_id_idx" ON "public"."InventoryHistory"("inventory_id");

-- CreateIndex
CREATE INDEX "InventoryHistory_user_id_idx" ON "public"."InventoryHistory"("user_id");

-- CreateIndex
CREATE INDEX "InventoryHistory_created_at_idx" ON "public"."InventoryHistory"("created_at");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Audit" ADD CONSTRAINT "Audit_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditRecord" ADD CONSTRAINT "AuditRecord_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditRecord" ADD CONSTRAINT "AuditRecord_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditRecordParticipant" ADD CONSTRAINT "AuditRecordParticipant_audit_record_id_fkey" FOREIGN KEY ("audit_record_id") REFERENCES "public"."AuditRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditRecordParticipant" ADD CONSTRAINT "AuditRecordParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryHistory" ADD CONSTRAINT "InventoryHistory_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryHistory" ADD CONSTRAINT "InventoryHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
