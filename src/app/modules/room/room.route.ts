// modules/room/room.route.ts
import { Router } from "express";
import { roomController } from "./room.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = Router();

// Room routes - all require authentication
router.post(
  "/",
  auth(),
  checkPermission("room", "create"),
  roomController.createRoom
);

router.get(
  "/",
  auth(),
  checkPermission("room", "read"),
  roomController.getAllRooms
);

router.get(
  "/:id",
  auth(),
  checkPermission("room", "read"),
  roomController.getRoomById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("room", "update"),
  roomController.updateRoom
);

router.delete(
  "/:id",
  auth(),
  checkPermission("room", "delete"),
  roomController.deleteRoom
);

export const roomRouter: Router = router;
