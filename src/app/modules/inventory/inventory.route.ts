// modules/inventory/inventory.route.ts
import { Router } from "express";
import { inventoryController } from "./inventory.controller";

const router = Router();

// Inventory routes
router.post("/", inventoryController.createInventory);
router.post("/bulk", inventoryController.createBulkInventory);
router.get("/", inventoryController.getAllInventories);
router.get("/room/:room_id", inventoryController.getInventoriesByRoom);
router.get("/:id", inventoryController.getInventoryById);
router.patch("/:id", inventoryController.updateInventory);
router.delete("/:id", inventoryController.deleteInventory);

export const inventoryRouter: Router = router;
