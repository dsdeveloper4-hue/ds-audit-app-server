// modules/item/item.route.ts
import { Router } from "express";
import { itemController } from "./item.controller";

const router = Router();

// Item routes
router.post("/", itemController.createItem);
router.get("/", itemController.getAllItems);
router.get("/:id", itemController.getItemById);
router.patch("/:id", itemController.updateItem);
router.delete("/:id", itemController.deleteItem);

export const itemRouter: Router = router;
