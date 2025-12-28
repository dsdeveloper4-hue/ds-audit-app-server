// modules/history/history.route.ts
import { Router } from "express";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";
import { historyController } from "./history.controller";

const router = Router();

// Protect all history routes with view_activity_history permission
router.get(
  "/",
  auth(),
  checkPermission("view_activity_history"),
  historyController.getRecentActivity
);

router.get(
  "/stats",
  auth(),
  checkPermission("view_activity_history"),
  historyController.getActivityStats
);

export const historyRoutes = router;
