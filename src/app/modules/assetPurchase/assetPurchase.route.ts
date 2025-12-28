// modules/assetPurchase/assetPurchase.route.ts
import { Router } from "express";
import { assetPurchaseController } from "./assetPurchase.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";
import upload from "@app/middlewares/upload";

const router = Router();

// Asset purchase routes - permission-based access
router.post(
  "/",
  auth(),
  checkPermission("create_asset_purchase"),
  upload.fields([
    { name: "item_image", maxCount: 1 },
    { name: "billing_image", maxCount: 1 },
  ]),
  assetPurchaseController.createAssetPurchase
);

router.get(
  "/",
  auth(),
  checkPermission("view_asset_purchases"),
  assetPurchaseController.getAllAssetPurchases
);

router.get(
  "/summary",
  auth(),
  checkPermission("view_asset_purchases"),
  assetPurchaseController.getPurchaseSummary
);

router.get(
  "/:id",
  auth(),
  checkPermission("view_asset_purchases"),
  assetPurchaseController.getAssetPurchaseById
);

router.patch(
  "/:id",
  auth(),
  checkPermission("edit_asset_purchase"),
  upload.fields([
    { name: "item_image", maxCount: 1 },
    { name: "billing_image", maxCount: 1 },
  ]),
  assetPurchaseController.updateAssetPurchase
);

router.delete(
  "/:id",
  auth(),
  checkPermission("delete_asset_purchase"),
  assetPurchaseController.deleteAssetPurchase
);

export const assetPurchaseRouter: Router = router;
