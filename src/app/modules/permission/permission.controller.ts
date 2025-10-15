import httpStatus from "http-status";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import { PermissionService } from "./permission.service";
import type { Request, Response } from "express";

// Get all permissions
const getAllPermissions = catchAsync(async (req, res) => {
  const result = await PermissionService.getAllPermissions();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permissions retrieved successfully",
    data: result,
  });
});

// Get single permission
const getPermissionById = catchAsync(async (req, res) => {
  const result = await PermissionService.getPermissionById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission retrieved successfully",
    data: result,
  });
});

// Create permission
const createPermission = catchAsync(async (req, res) => {
  const result = await PermissionService.createPermission(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Permission created successfully",
    data: result,
  });
});

// Update permission
const updatePermission = catchAsync(async (req, res) => {
  const result = await PermissionService.updatePermission(
    req.params.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission updated successfully",
    data: result,
  });
});

// Delete permission
const deletePermission = catchAsync(async (req, res) => {
  const result = await PermissionService.deletePermission(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission deleted successfully",
    data: result,
  });
});

export const PermissionController = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};
