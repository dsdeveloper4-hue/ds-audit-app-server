// modules/assetPurchase/assetPurchase.route.ts
import { Router } from "express";
import { assetPurchaseController } from "./assetPurchase.controller";
import auth from "@app/middlewares/auth";
import { roleAuth } from "@app/middlewares/roleAuth";
import upload from "@app/middlewares/upload";
import { Role } from "@prisma/client";

const router = Router();

// Asset purchase routes
router.post(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  upload.fields([
    { name: "item_image", maxCount: 1 },
    { name: "billing_image", maxCount: 1 },
  ]),
  assetPurchaseController.createAssetPurchase
);

router.get(
  "/",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  assetPurchaseController.getAllAssetPurchases
);

router.get(
  "/summary",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  assetPurchaseController.getPurchaseSummary
);

router.get(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN, Role.USER]),
  assetPurchaseController.getAssetPurchaseById
);

router.patch(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  upload.fields([
    { name: "item_image", maxCount: 1 },
    { name: "billing_image", maxCount: 1 },
  ]),
  assetPurchaseController.updateAssetPurchase
);

router.delete(
  "/:id",
  auth(),
  roleAuth([Role.SUPER_ADMIN, Role.ADMIN]),
  assetPurchaseController.deleteAssetPurchase
);

export const assetPurchaseRouter: Router = router;
