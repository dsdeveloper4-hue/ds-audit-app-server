import express from "express";
import { PermissionController } from "./permission.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = express.Router();

// Get all permissions
router.get(
  "/",
  auth(),
  checkPermission("permission", "read"),
  PermissionController.getAllPermissions
);

// Get single permission
router.get(
  "/:id",
  auth(),
  checkPermission("permission", "read"),
  PermissionController.getPermissionById
);

// Create permission
router.post(
  "/",
  auth(),
  checkPermission("permission", "create"),
  PermissionController.createPermission
);

// Update permission
router.patch(
  "/:id",
  auth(),
  checkPermission("permission", "update"),
  PermissionController.updatePermission
);

// Delete permission
router.delete(
  "/:id",
  auth(),
  checkPermission("permission", "delete"),
  PermissionController.deletePermission
);

export const PermissionRoutes = router;
