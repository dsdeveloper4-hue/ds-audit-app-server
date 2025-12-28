-- CreateTable
CREATE TABLE "public"."EntityAssignment" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "assigned_by" TEXT,
    "unassigned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityAssignment_entity_type_entity_id_idx" ON "public"."EntityAssignment"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "EntityAssignment_employee_id_idx" ON "public"."EntityAssignment"("employee_id");

-- CreateIndex
CREATE INDEX "EntityAssignment_assigned_at_idx" ON "public"."EntityAssignment"("assigned_at");

-- CreateIndex
CREATE INDEX "EntityAssignment_unassigned_at_idx" ON "public"."EntityAssignment"("unassigned_at");

-- AddForeignKey
ALTER TABLE "public"."EntityAssignment" ADD CONSTRAINT "EntityAssignment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
