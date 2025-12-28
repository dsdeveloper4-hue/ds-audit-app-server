// modules/user/user.route.ts
import { Router } from "express";
import { userController } from "./user.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// User management routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("create_user"),
  userController.createUser
);

router.get(
  "/",
  auth(),
  checkPermission("view_users"),
  userController.getAllUsers
);

router.get(
  "/roles",
  auth(),
  checkPermission("view_users"),
  userController.getAllRoles
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_users"),
  userController.getUserById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("edit_user"),
  userController.updateUser
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_user"),
  userController.deleteUser
);

export const userRouter: Router = router;
