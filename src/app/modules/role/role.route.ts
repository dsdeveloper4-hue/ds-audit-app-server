import express from "express";
import { RoleController } from "./role.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = express.Router();

// Get all roles
router.get(
  "/",
  auth(),
  checkPermission("role", "read"),
  RoleController.getAllRoles
);

// Get single role
router.get(
  "/:id",
  auth(),
  checkPermission("role", "read"),
  RoleController.getRoleById
);

// Create role
router.post(
  "/",
  auth(),
  checkPermission("role", "create"),
  RoleController.createRole
);

// Update role
router.patch(
  "/:id",
  auth(),
  checkPermission("role", "update"),
  RoleController.updateRole
);

// Assign permissions to role
router.post(
  "/:id/permissions",
  auth(),
  checkPermission("role", "update"),
  RoleController.assignPermissions
);

// Remove permission from role
router.delete(
  "/:id/permissions/:permissionId",
  auth(),
  checkPermission("role", "update"),
  RoleController.removePermission
);

// Delete role
router.delete(
  "/:id",
  auth(),
  checkPermission("role", "delete"),
  RoleController.deleteRole
);

export const RoleRoutes = router;
