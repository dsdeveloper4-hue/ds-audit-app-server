// modules/item/item.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { itemService } from "./item.service";

const createItem = catchAsync(async (req: Request, res: Response) => {
  const result = await itemService.createItem(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Item created successfully!",
    data: result,
  });
});

const getAllItems = catchAsync(async (_req: Request, res: Response) => {
  const result = await itemService.getAllItems();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Items retrieved successfully!",
    data: result,
  });
});

const getItemById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemService.getItemById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item retrieved successfully!",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemService.updateItem(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item updated successfully!",
    data: result,
  });
});

const deleteItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemService.deleteItem(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item deleted successfully!",
    data: result,
  });
});

export const itemController = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
