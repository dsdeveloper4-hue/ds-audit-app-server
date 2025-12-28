// modules/item/itemDetails.route.ts
import { Router } from "express";
import { itemDetailsController } from "./itemDetails.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// Item Details routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("manage_audit_items"),
  itemDetailsController.createItemDetails
);

router.get(
  "/",
  auth(),
  checkPermission("view_audits"),
  itemDetailsController.getAllItemDetails
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_audits"),
  itemDetailsController.getItemDetailsById
);

router.get(
  "/room/:room_id/item/:item_id",
  auth(),
  checkPermission("view_audits"),
  itemDetailsController.getItemDetailsByRoomAndItem
);

router.patch(
  "/:id",
  auth(),
  checkPermission("manage_audit_items"),
  itemDetailsController.updateItemDetails
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_audit"),
  itemDetailsController.deleteItemDetails
);

export const itemDetailsRouter: Router = router;
