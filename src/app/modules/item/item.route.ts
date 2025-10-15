// modules/item/item.route.ts
import { Router } from "express";
import { itemController } from "./item.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = Router();

// Item routes - all require authentication
router.post(
  "/",
  auth(),
  checkPermission("item", "create"),
  itemController.createItem
);

router.get(
  "/",
  auth(),
  checkPermission("item", "read"),
  itemController.getAllItems
);

router.get(
  "/:id",
  auth(),
  checkPermission("item", "read"),
  itemController.getItemById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("item", "update"),
  itemController.updateItem
);

router.delete(
  "/:id",
  auth(),
  checkPermission("item", "delete"),
  itemController.deleteItem
);

export const itemRouter: Router = router;
