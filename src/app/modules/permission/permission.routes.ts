// modules/permission/permission.routes.ts
import express from "express";
import { permissionController } from "./permission.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = express.Router();

// Get all permissions (any authenticated user)
router.get("/", auth(), permissionController.getAllPermissions);

// Get user permissions
router.get("/user/:userId", auth(), permissionController.getUserPermissions);

// Update user permissions (requires manage_permissions)
router.put(
  "/user/:userId",
  auth(),
  checkPermission("manage_permissions"),
  permissionController.updateUserPermissions
);

// Get role permissions
router.get("/role/:role", auth(), permissionController.getRolePermissions);

// Update role permissions (super admin only)
router.put("/role/:role", auth(), permissionController.updateRolePermissions);

// Create permission (super admin only)
router.post("/", auth(), permissionController.createPermission);

// Delete permission (super admin only)
router.delete("/:id", auth(), permissionController.deletePermission);

export const permissionRoutes = router;
