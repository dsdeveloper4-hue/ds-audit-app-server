-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "office_name" TEXT;

-- CreateIndex
CREATE INDEX "Room_office_name_idx" ON "public"."Room"("office_name");
