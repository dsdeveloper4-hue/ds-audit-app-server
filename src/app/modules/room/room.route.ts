// modules/room/room.route.ts
import { Router } from "express";
import { roomController } from "./room.controller";

const router = Router();

// Room routes
router.post("/", roomController.createRoom);
router.get("/", roomController.getAllRooms);
router.get("/:id", roomController.getRoomById);
router.patch("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

export const roomRouter: Router = router;
