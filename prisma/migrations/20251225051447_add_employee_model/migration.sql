-- CreateEnum
CREATE TYPE "public"."EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESIGNED', 'ON_LEAVE');

-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'EDITOR';

-- AlterTable
ALTER TABLE "public"."AssetPurchase" ADD COLUMN     "assigned_employee_id" TEXT;

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "joining_date" TIMESTAMP(3),
    "department" TEXT,
    "designation" TEXT,
    "workplace" TEXT,
    "employment_type" TEXT,
    "status" "public"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "status_reason" TEXT,
    "status_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_id_key" ON "public"."Employee"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "public"."Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_employee_id_idx" ON "public"."Employee"("employee_id");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "public"."Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "public"."Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_name_idx" ON "public"."Employee"("name");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "public"."Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_created_at_idx" ON "public"."Employee"("created_at");

-- CreateIndex
CREATE INDEX "AssetPurchase_assigned_employee_id_idx" ON "public"."AssetPurchase"("assigned_employee_id");

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
