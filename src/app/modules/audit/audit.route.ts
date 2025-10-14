// modules/audit/audit.route.ts
import { Router } from "express";
import { auditController } from "./audit.controller";

const router = Router();

// Audit routes
router.post("/", auditController.createAudit);
router.get("/", auditController.getAllAudits);
router.get("/:id", auditController.getAuditById);
router.patch("/:id", auditController.updateAudit);
router.patch("/:id/complete", auditController.completeAudit);
router.delete("/:id", auditController.deleteAudit);

export const auditRouter: Router = router;
