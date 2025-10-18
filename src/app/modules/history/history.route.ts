// modules/history/history.route.ts
import { Router } from "express";
import auth from "@app/middlewares/auth";
import { historyController } from "./history.controller";

const router = Router();

router.get("/", auth(), historyController.getRecentActivity);
router.get("/stats", auth(), historyController.getActivityStats);

export const historyRoutes = router;
