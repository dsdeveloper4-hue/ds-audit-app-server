import httpStatus from "http-status";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import { RoleService } from "./role.service";
import type { Request, Response } from "express";

// Get all roles
const getAllRoles = catchAsync(async (req, res) => {
  const result = await RoleService.getAllRoles();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roles retrieved successfully",
    data: result,
  });
});

// Get single role
const getRoleById = catchAsync(async (req, res) => {
  const result = await RoleService.getRoleById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role retrieved successfully",
    data: result,
  });
});

// Create role
const createRole = catchAsync(async (req, res) => {
  const result = await RoleService.createRole(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Role created successfully",
    data: result,
  });
});

// Update role
const updateRole = catchAsync(async (req, res) => {
  const result = await RoleService.updateRole(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role updated successfully",
    data: result,
  });
});

// Delete role
const deleteRole = catchAsync(async (req, res) => {
  const result = await RoleService.deleteRole(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role deleted successfully",
    data: result,
  });
});

// Assign permissions to role
const assignPermissions = catchAsync(async (req, res) => {
  const result = await RoleService.assignPermissions(
    req.params.id,
    req.body.permission_ids
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permissions assigned successfully",
    data: result,
  });
});

// Remove permission from role
const removePermission = catchAsync(async (req, res) => {
  const result = await RoleService.removePermission(
    req.params.id,
    req.params.permissionId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission removed successfully",
    data: result,
  });
});

export const RoleController = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermission,
};
