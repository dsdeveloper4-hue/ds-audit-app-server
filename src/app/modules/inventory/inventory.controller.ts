// modules/inventory/inventory.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { inventoryService } from "./inventory.service";

const createInventory = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.createInventory(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Inventory created successfully!",
    data: result,
  });
});

const createBulkInventory = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.createBulkInventory(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.length} inventory records created successfully!`,
    data: result,
  });
});

const getAllInventories = catchAsync(async (_req: Request, res: Response) => {
  const result = await inventoryService.getAllInventories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventories retrieved successfully!",
    data: result,
  });
});

const getInventoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await inventoryService.getInventoryById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory retrieved successfully!",
    data: result,
  });
});

const getInventoriesByRoom = catchAsync(async (req: Request, res: Response) => {
  const { room_id } = req.params;
  const result = await inventoryService.getInventoriesByRoom(room_id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room inventories retrieved successfully!",
    data: result,
  });
});

const updateInventory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await inventoryService.updateInventory(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory updated successfully!",
    data: result,
  });
});

const deleteInventory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await inventoryService.deleteInventory(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Inventory deleted successfully!",
    data: result,
  });
});

export const inventoryController = {
  createInventory,
  createBulkInventory,
  getAllInventories,
  getInventoryById,
  getInventoriesByRoom,
  updateInventory,
  deleteInventory,
};
