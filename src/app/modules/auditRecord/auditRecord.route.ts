// modules/auditRecord/auditRecord.route.ts
import { Router } from "express";
import { auditRecordController } from "./auditRecord.controller";

const router = Router();

// Audit Record routes
router.get("/audit/:audit_id", auditRecordController.getAuditRecordsByAuditId);
router.get("/:id", auditRecordController.getAuditRecordById);
router.patch("/bulk", auditRecordController.bulkUpdateAuditRecords);
router.patch("/:id", auditRecordController.updateAuditRecord);
router.post("/:id/participant", auditRecordController.addParticipant);
router.delete(
  "/:id/participant/:user_id",
  auditRecordController.removeParticipant
);

export const auditRecordRouter: Router = router;
