// modules/auth/auth.route.ts
import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// Auth routes
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

export const authRouter: Router = router;
