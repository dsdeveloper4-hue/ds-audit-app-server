// modules/room/room.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { roomService } from "./room.service";

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.createRoom(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Room created successfully!",
    data: result,
  });
});

const getAllRooms = catchAsync(async (_req: Request, res: Response) => {
  const result = await roomService.getAllRooms();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rooms retrieved successfully!",
    data: result,
  });
});

const getRoomById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await roomService.getRoomById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room retrieved successfully!",
    data: result,
  });
});

const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await roomService.updateRoom(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room updated successfully!",
    data: result,
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await roomService.deleteRoom(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room deleted successfully!",
    data: result,
  });
});

export const roomController = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
