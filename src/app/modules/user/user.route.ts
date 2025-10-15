// modules/user/user.route.ts
import { Router } from "express";
import { userController } from "./user.controller";
import auth from "@app/middlewares/auth";
import { userManagementAuth } from "@app/middlewares/roleAuth";

const router = Router();

// User management routes - role-based access
router.post(
  "/",
  auth(),
  userManagementAuth("create"),
  userController.createUser
);

router.get(
  "/",
  auth(),
  userManagementAuth("read"),
  userController.getAllUsers
);

router.get(
  "/roles",
  auth(),
  userManagementAuth("read"),
  userController.getAllRoles
);

router.get(
  "/:id",
  auth(),
  userManagementAuth("read"),
  userController.getUserById
);

router.patch(
  "/:id",
  auth(),
  userManagementAuth("update"),
  userController.updateUser
);

router.delete(
  "/:id",
  auth(),
  userManagementAuth("delete"),
  userController.deleteUser
);

export const userRouter: Router = router;
