import httpStatus from "http-status";
import prisma from "@app/lib/prisma";
import AppError from "@app/errors/AppError";

// Get all permissions
const getAllPermissions = async () => {
  const permissions = await prisma.permission.findMany({
    include: {
      _count: {
        select: {
          roles: true,
        },
      },
    },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  return permissions;
};

// Get single permission by ID
const getPermissionById = async (id: string) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!permission) {
    throw new AppError(httpStatus.NOT_FOUND, "Permission not found");
  }

  return permission;
};

// Create new permission
const createPermission = async (payload: {
  name: string;
  resource: string;
  action: string;
}) => {
  // Check if permission with same resource and action exists
  const existingPermission = await prisma.permission.findFirst({
    where: {
      resource: payload.resource,
      action: payload.action,
    },
  });

  if (existingPermission) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Permission with this resource and action already exists"
    );
  }

  const permission = await prisma.permission.create({
    data: payload,
  });

  return permission;
};

// Update permission
const updatePermission = async (
  id: string,
  payload: {
    name?: string;
    resource?: string;
    action?: string;
  }
) => {
  const permission = await prisma.permission.findUnique({ where: { id } });

  if (!permission) {
    throw new AppError(httpStatus.NOT_FOUND, "Permission not found");
  }

  // Check if updating to existing resource/action combination
  if (payload.resource || payload.action) {
    const checkResource = payload.resource || permission.resource;
    const checkAction = payload.action || permission.action;

    const existingPermission = await prisma.permission.findFirst({
      where: {
        resource: checkResource,
        action: checkAction,
        NOT: { id },
      },
    });

    if (existingPermission) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Permission with this resource and action already exists"
      );
    }
  }

  const updatedPermission = await prisma.permission.update({
    where: { id },
    data: payload,
  });

  return updatedPermission;
};

// Delete permission
const deletePermission = async (id: string) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          roles: true,
        },
      },
    },
  });

  if (!permission) {
    throw new AppError(httpStatus.NOT_FOUND, "Permission not found");
  }

  // Check if permission is assigned to roles
  if (permission._count.roles > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete permission assigned to ${permission._count.roles} roles`
    );
  }

  const deletedPermission = await prisma.permission.delete({
    where: { id },
  });

  return deletedPermission;
};

export const PermissionService = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};
