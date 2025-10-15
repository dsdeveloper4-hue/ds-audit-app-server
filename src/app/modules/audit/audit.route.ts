// modules/audit/audit.route.ts
import { Router } from "express";
import { auditController } from "./audit.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = Router();

// Audit routes - all require authentication
router.post(
  "/",
  auth(),
  checkPermission("audit", "create"),
  auditController.createAudit
);

router.get(
  "/",
  auth(),
  checkPermission("audit", "read"),
  auditController.getAllAudits
);

router.get(
  "/:id",
  auth(),
  checkPermission("audit", "read"),
  auditController.getAuditById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("audit", "update"),
  auditController.updateAudit
);

// Item detail routes for audits
router.post(
  "/:audit_id/items",
  auth(),
  checkPermission("audit", "update"),
  auditController.addItemDetailToAudit
);

router.patch(
  "/items/:detail_id",
  auth(),
  checkPermission("audit", "update"),
  auditController.updateItemDetail
);

router.delete(
  "/items/:detail_id",
  auth(),
  checkPermission("audit", "delete"),
  auditController.deleteItemDetail
);

router.delete(
  "/:id",
  auth(),
  checkPermission("audit", "delete"),
  auditController.deleteAudit
);

export const auditRouter: Router = router;
