// modules/permission/permission.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { permissionService } from "./permission.service";

const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await permissionService.getAllPermissions();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permissions retrieved successfully",
    data: result,
  });
});

const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await permissionService.getUserPermissionsById(
    req.params.userId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User permissions retrieved successfully",
    data: result,
  });
});

const updateUserPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await permissionService.updateUserPermissions(
      req.params.userId,
      req
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User permissions updated successfully",
      data: result,
    });
  }
);

const getRolePermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await permissionService.getRolePermissions(
    req.params.role as any
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role permissions retrieved successfully",
    data: result,
  });
});

const updateRolePermissions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await permissionService.updateRolePermissions(
      req.params.role as any,
      req
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Role permissions updated successfully",
      data: result,
    });
  }
);

const createPermission = catchAsync(async (req: Request, res: Response) => {
  const result = await permissionService.createPermission(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Permission created successfully",
    data: result,
  });
});

const deletePermission = catchAsync(async (req: Request, res: Response) => {
  const result = await permissionService.deletePermission(req.params.id, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission deleted successfully",
    data: result,
  });
});

export const permissionController = {
  getAllPermissions,
  getUserPermissions,
  updateUserPermissions,
  getRolePermissions,
  updateRolePermissions,
  createPermission,
  deletePermission,
};
