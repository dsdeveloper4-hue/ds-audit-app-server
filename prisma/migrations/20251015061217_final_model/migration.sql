-- AlterTable
ALTER TABLE "public"."Permission" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

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
CREATE INDEX "_AuditParticipants_B_index" ON "public"."_AuditParticipants"("B");

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
