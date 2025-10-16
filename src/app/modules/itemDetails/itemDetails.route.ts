// modules/item/itemDetails.route.ts
import { Router } from "express";
import { itemDetailsController } from "./itemDetails.controller";
import auth from "@app/middlewares/auth";
import { roleAuth } from "@app/middlewares/roleAuth";
import { Role } from "@prisma/client";

const router = Router();

// Item Details routes - role-based access
router.post(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemDetailsController.createItemDetails
);

router.get(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemDetailsController.getAllItemDetails
);

router.get(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemDetailsController.getItemDetailsById
);

router.get(
  "/room/:room_id/item/:item_id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemDetailsController.getItemDetailsByRoomAndItem
);

router.patch(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  itemDetailsController.updateItemDetails
);

router.delete(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  itemDetailsController.deleteItemDetails
);

export const itemDetailsRouter: Router = router;
