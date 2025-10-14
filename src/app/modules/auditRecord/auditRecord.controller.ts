// modules/auditRecord/auditRecord.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { auditRecordService } from "./auditRecord.service";

const getAuditRecordById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditRecordService.getAuditRecordById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit record retrieved successfully!",
    data: result,
  });
});

const getAuditRecordsByAuditId = catchAsync(
  async (req: Request, res: Response) => {
    const { audit_id } = req.params;
    const result = await auditRecordService.getAuditRecordsByAuditId(audit_id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Audit records retrieved successfully!",
      data: result,
    });
  }
);

const updateAuditRecord = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditRecordService.updateAuditRecord(id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Audit record updated successfully!",
    data: result,
  });
});

const bulkUpdateAuditRecords = catchAsync(
  async (req: Request, res: Response) => {
    const result = await auditRecordService.bulkUpdateAuditRecords(req);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `${result.updatedCount} audit records updated successfully!`,
      data: result,
    });
  }
);

const addParticipant = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await auditRecordService.addParticipant(id, req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Participant added successfully!",
    data: result,
  });
});

const removeParticipant = catchAsync(async (req: Request, res: Response) => {
  const { id, user_id } = req.params;
  const result = await auditRecordService.removeParticipant(id, user_id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Participant removed successfully!",
    data: result,
  });
});

export const auditRecordController = {
  getAuditRecordById,
  getAuditRecordsByAuditId,
  updateAuditRecord,
  bulkUpdateAuditRecords,
  addParticipant,
  removeParticipant,
};
