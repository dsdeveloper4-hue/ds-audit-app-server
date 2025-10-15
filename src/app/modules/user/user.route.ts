// modules/user/user.route.ts
import { Router } from "express";
import { userController } from "./user.controller";
import auth from "@app/middlewares/auth";
import checkPermission from "@app/middlewares/checkPermission";

const router = Router();

// User management routes - admin only
router.post(
  "/",
  auth(),
  checkPermission("user", "create"),
  userController.createUser
);

router.get(
  "/",
  auth(),
  checkPermission("user", "read"),
  userController.getAllUsers
);

router.get(
  "/roles",
  auth(),
  checkPermission("user", "read"),
  userController.getAllRoles
);

router.get(
  "/:id",
  auth(),
  checkPermission("user", "read"),
  userController.getUserById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("user", "update"),
  userController.updateUser
);

router.delete(
  "/:id",
  auth(),
  checkPermission("user", "delete"),
  userController.deleteUser
);

export const userRouter: Router = router;
