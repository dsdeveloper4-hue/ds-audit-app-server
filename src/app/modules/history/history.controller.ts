// modules/history/history.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { historyService } from "./history.service";

const getRecentActivity = catchAsync(async (req: Request, res: Response) => {
  const result = await historyService.getRecentActivity(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Activity history retrieved successfully!",
    data: result,
  });
});

const getActivityStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await historyService.getActivityStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Activity stats retrieved successfully!",
    data: result,
  });
});

export const historyController = {
  getRecentActivity,
  getActivityStats,
};
