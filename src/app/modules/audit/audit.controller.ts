// modules/audit/audit.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { auditService } from "./audit.service";

const createAudit = catchAsync(async (req: Request, res: Response) => {
  const result = await auditService.createAudit(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `Audit created successfully with ${result.totalRecords} records!`,
    data: result,
  });
});

const getAllAudits = catchAsync(async (_req: Request, res: Response) => {
  const result = await auditService.getAllAudits();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audits retrieved successfully!",
    data: result,
  });
});

const getAuditById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.getAuditById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit retrieved successfully!",
    data: result,
  });
});

const updateAudit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.updateAudit(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit updated successfully!",
    data: result,
  });
});

const completeAudit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.completeAudit(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit completed successfully!",
    data: result,
  });
});

const deleteAudit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.deleteAudit(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit deleted successfully!",
    data: result,
  });
});

export const auditController = {
  createAudit,
  getAllAudits,
  getAuditById,
  updateAudit,
  completeAudit,
  deleteAudit,
};
