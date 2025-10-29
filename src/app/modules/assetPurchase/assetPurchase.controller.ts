// modules/assetPurchase/assetPurchase.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { assetPurchaseService } from "./assetPurchase.service";

const createAssetPurchase = catchAsync(async (req: Request, res: Response) => {
  const result = await assetPurchaseService.createAssetPurchase(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Asset purchase created successfully!",
    data: result,
  });
});

const getAllAssetPurchases = catchAsync(async (req: Request, res: Response) => {
  const result = await assetPurchaseService.getAllAssetPurchases(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Asset purchases retrieved successfully!",
    data: result,
  });
});

const getAssetPurchaseById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await assetPurchaseService.getAssetPurchaseById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Asset purchase retrieved successfully!",
    data: result,
  });
});

const updateAssetPurchase = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await assetPurchaseService.updateAssetPurchase(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Asset purchase updated successfully!",
    data: result,
  });
});

const deleteAssetPurchase = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await assetPurchaseService.deleteAssetPurchase(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Asset purchase deleted successfully!",
    data: result,
  });
});

const getPurchaseSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await assetPurchaseService.getPurchaseSummary(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Purchase summary retrieved successfully!",
    data: result,
  });
});

export const assetPurchaseController = {
  createAssetPurchase,
  getAllAssetPurchases,
  getAssetPurchaseById,
  updateAssetPurchase,
  deleteAssetPurchase,
  getPurchaseSummary,
};
