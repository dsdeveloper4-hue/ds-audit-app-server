// modules/audit/audit.route.ts
import { Router } from "express";
import { auditController } from "./audit.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// Audit routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("create_audit"),
  auditController.createAudit
);

router.get(
  "/",
  auth(),
  checkPermission("view_audits"),
  auditController.getAllAudits
);

router.get(
  "/latest",
  auth(),
  checkPermission("view_audits"),
  auditController.getLatestAudit
);

router.get(
  "/dashboard-totals",
  auth(),
  checkPermission("view_dashboard"),
  auditController.getDashboardTotals
);

router.get(
  "/status-history/:status",
  auth(),
  checkPermission("view_audits"),
  auditController.getStatusHistory
);

router.get(
  "/:id/summary",
  auth(),
  checkPermission("view_audits"),
  auditController.getItemSummaryByAuditId
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_audits"),
  auditController.getAuditById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("edit_audit"),
  auditController.updateAudit
);

// Update adjustment percentage
router.patch(
  "/:id/adjustment",
  auth(),
  checkPermission("edit_audit"),
  auditController.updateAdjustment
);

// Cleanup zero-quantity items
router.post(
  "/:id/cleanup",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.cleanupZeroQuantityItems
);

// Sync audit with asset purchases
router.post(
  "/:id/sync",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.syncAuditWithAssetPurchases
);

// Recalculate prices for an audit
router.post(
  "/:id/recalculate-prices",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.recalculateAuditPrices
);

// Recalculate prices for the latest audit
router.post(
  "/latest/recalculate-prices",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.recalculateLatestAuditPrices
);

// Item detail routes for audits
router.post(
  "/:audit_id/items",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.addItemDetailToAudit
);

router.patch(
  "/items/:detail_id",
  auth(),
  checkPermission("manage_audit_items"),
  auditController.updateItemDetail
);

router.delete(
  "/items/:detail_id",
  auth(),
  checkPermission("delete_audit"),
  auditController.deleteItemDetail
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_audit"),
  auditController.deleteAudit
);

export const auditRouter: Router = router;
