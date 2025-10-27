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
    message: "Audit created successfully!",
    data: result,
  });
});

const getLatestAudit = catchAsync(async (_req: Request, res: Response) => {
  const result = await auditService.getLatestAudit();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Latest audit retrieved successfully!",
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

const addItemDetailToAudit = catchAsync(async (req: Request, res: Response) => {
  const { audit_id } = req.params;
  const result = await auditService.addItemDetailToAudit(audit_id, req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Item added to audit successfully!",
    data: result,
  });
});

const updateItemDetail = catchAsync(async (req: Request, res: Response) => {
  const { detail_id } = req.params;
  const result = await auditService.updateItemDetail(detail_id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item detail updated successfully!",
    data: result,
  });
});

const deleteItemDetail = catchAsync(async (req: Request, res: Response) => {
  const { detail_id } = req.params;
  const result = await auditService.deleteItemDetail(detail_id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item detail deleted successfully!",
    data: result,
  });
});

const deleteAudit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.deleteAudit(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit deleted successfully!",
    data: result,
  });
});

const getItemSummaryByAuditId = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditService.getItemSummaryByAuditId(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item summary retrieved successfully!",
    data: result,
  });
});

export const auditController = {
  createAudit,
  getAllAudits,
  getAuditById,
  getLatestAudit,
  updateAudit,
  addItemDetailToAudit,
  updateItemDetail,
  deleteItemDetail,
  deleteAudit,
  getItemSummaryByAuditId,
};
