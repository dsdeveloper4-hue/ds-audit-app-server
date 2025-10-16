// modules/item/item.route.ts
import { Router } from "express";
import { itemController } from "./item.controller";
import { itemDetailsRouter } from "../itemDetails/itemDetails.route";
import auth from "@app/middlewares/auth";
import { roleAuth } from "@app/middlewares/roleAuth";
import { Role } from "@prisma/client";

const router = Router();

// Item routes - role-based access
router.post(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  itemController.createItem
);

router.get(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemController.getAllItems
);

router.get(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemController.getItemById
);

router.patch(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  itemController.updateItem
);

router.delete(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  itemController.deleteItem
);

// Mount ItemDetails routes under /details sub-route
router.use("/details", itemDetailsRouter);

export const itemRouter: Router = router;
