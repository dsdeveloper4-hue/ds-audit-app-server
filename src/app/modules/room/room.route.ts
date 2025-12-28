// modules/room/room.route.ts
import { Router } from "express";
import { roomController } from "./room.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// Room routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("create_room"),
  roomController.createRoom
);

router.get(
  "/",
  auth(),
  checkPermission("view_rooms"),
  roomController.getAllRooms
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_rooms"),
  roomController.getRoomById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("edit_room"),
  roomController.updateRoom
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_room"),
  roomController.deleteRoom
);

export const roomRouter: Router = router;
