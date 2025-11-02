// modules/audit/audit.route.ts
import { Router } from "express";
import { auditController } from "./audit.controller";
import auth from "@app/middlewares/auth";
import { roleAuth } from "@app/middlewares/roleAuth";
import { Role } from "@prisma/client";

const router = Router();

// Audit routes - role-based access
router.post(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  auditController.createAudit
);

router.get(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.getAllAudits
);

router.get(
  "/latest",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.getLatestAudit
);

router.get(
  "/:id/summary",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.getItemSummaryByAuditId
);

router.get(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.getAuditById
);

router.patch(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  auditController.updateAudit
);

// Update adjustment percentage
router.patch(
  "/:id/adjustment",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  auditController.updateAdjustment
);

// Item detail routes for audits
router.post(
  "/:audit_id/items",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.addItemDetailToAudit
);

router.patch(
  "/items/:detail_id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  auditController.updateItemDetail
);

router.delete(
  "/items/:detail_id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  auditController.deleteItemDetail
);

router.delete(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  auditController.deleteAudit
);

export const auditRouter: Router = router;
