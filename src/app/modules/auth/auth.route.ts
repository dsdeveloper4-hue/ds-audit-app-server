// modules/auth/auth.route.ts
import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// Auth routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

export const authRouter: Router = router;
