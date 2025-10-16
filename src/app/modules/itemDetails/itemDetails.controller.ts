// modules/item/itemDetails.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { itemDetailsService } from "./itemDetails.service";

const createItemDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await itemDetailsService.createItemDetails(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Item details created successfully!",
    data: result,
  });
});

const getAllItemDetails = catchAsync(async (_req: Request, res: Response) => {
  const result = await itemDetailsService.getAllItemDetails();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item details retrieved successfully!",
    data: result,
  });
});

const getItemDetailsById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemDetailsService.getItemDetailsById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item details retrieved successfully!",
    data: result,
  });
});

const getItemDetailsByRoomAndItem = catchAsync(async (req: Request, res: Response) => {
  const { room_id, item_id } = req.params;
  const result = await itemDetailsService.getItemDetailsByRoomAndItem(room_id, item_id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item details for room and item retrieved successfully!",
    data: result,
  });
});

const updateItemDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemDetailsService.updateItemDetails(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item details updated successfully!",
    data: result,
  });
});

const deleteItemDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await itemDetailsService.deleteItemDetails(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item details deleted successfully!",
    data: result,
  });
});

export const itemDetailsController = {
  createItemDetails,
  getAllItemDetails,
  getItemDetailsById,
  getItemDetailsByRoomAndItem,
  updateItemDetails,
  deleteItemDetails,
};
