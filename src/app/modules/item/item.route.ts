// modules/item/item.route.ts
import { Router } from "express";
import { itemController } from "./item.controller";
import { itemDetailsRouter } from "../itemDetails/itemDetails.route";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// Item routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("create_item"),
  itemController.createItem
);

router.get(
  "/",
  auth(),
  checkPermission("view_items"),
  itemController.getAllItems
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_items"),
  itemController.getItemById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("edit_item"),
  itemController.updateItem
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_item"),
  itemController.deleteItem
);

// Mount ItemDetails routes under /details sub-route
router.use("/details", itemDetailsRouter);

export const itemRouter: Router = router;
