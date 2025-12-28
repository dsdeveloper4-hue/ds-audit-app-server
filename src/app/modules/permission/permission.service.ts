// modules/permission/permission.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { User, Permission, Role } from "@prisma/client";
import { getUserPermissions } from "@app/middlewares/checkPermission";

// ---------------- GET ALL PERMISSIONS ----------------
const getAllPermissions = async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped = permissions.reduce((acc, permission) => {
    const category = permission.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return {
    all: permissions,
    grouped,
  };
};

// ---------------- GET USER PERMISSIONS ----------------
const getUserPermissionsById = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    // Get all permissions for this user
    const permissions = await getUserPermissions(userId, user.role);

    // Get role-based permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    // Get user-specific overrides
    const userOverrides = await prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { permission: true },
    });

    return {
      userId: user.id,
      userName: user.name,
      role: user.role,
      permissions,
      rolePermissions: rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        category: rp.permission.category,
        source: "role",
      })),
      userOverrides: userOverrides.map((up) => ({
        id: up.permission.id,
        name: up.permission.name,
        description: up.permission.description,
        category: up.permission.category,
        granted: up.granted,
        source: "user",
      })),
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    throw error;
  }
};

// ---------------- UPDATE USER PERMISSIONS ----------------
const updateUserPermissions = async (userId: string, req: Request) => {
  const currentUser = req.user as User;
  const { permissions } = req.body as {
    permissions: Array<{ permission_id: string; granted: boolean }>;
  };

  if (!permissions || !Array.isArray(permissions)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Permissions array is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Prevent modifying super admin permissions
  if (user.role === "SUPER_ADMIN" && currentUser.id !== user.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Cannot modify super admin permissions"
    );
  }

  // Update permissions
  const results = [];
  for (const { permission_id, granted } of permissions) {
    const permission = await prisma.permission.findUnique({
      where: { id: permission_id },
    });

    if (!permission) {
      continue; // Skip invalid permissions
    }

    const result = await prisma.userPermission.upsert({
      where: {
        user_id_permission_id: {
          user_id: userId,
          permission_id,
        },
      },
      update: {
        granted,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        permission_id,
        granted,
      },
      include: {
        permission: true,
      },
    });

    results.push(result);
  }

  // Log activity
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "UserPermission",
      entity_id: userId,
      entity_name: user.name,
      action_type: "UPDATE",
      description: `Updated permissions for user: ${user.name}`,
      metadata: {
        permissions_updated: results.length,
      },
    },
  });

  return {
    message: "Permissions updated successfully",
    updated: results.length,
  };
};

// ---------------- GET ROLE PERMISSIONS ----------------
const getRolePermissions = async (role: Role) => {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: true },
  });

  return rolePermissions.map((rp) => rp.permission);
};

// ---------------- UPDATE ROLE PERMISSIONS ----------------
const updateRolePermissions = async (role: Role, req: Request) => {
  const currentUser = req.user as User;
  const { permission_ids } = req.body as {
    permission_ids: string[];
  };

  if (!permission_ids || !Array.isArray(permission_ids)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Permission IDs array is required"
    );
  }

  // Only super admin can modify role permissions
  if (currentUser.role !== "SUPER_ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only super admins can modify role permissions"
    );
  }

  // Delete existing role permissions
  await prisma.rolePermission.deleteMany({
    where: { role },
  });

  // Create new role permissions
  const results = [];
  for (const permission_id of permission_ids) {
    const permission = await prisma.permission.findUnique({
      where: { id: permission_id },
    });

    if (!permission) {
      continue; // Skip invalid permissions
    }

    const result = await prisma.rolePermission.create({
      data: {
        role,
        permission_id,
      },
      include: {
        permission: true,
      },
    });

    results.push(result);
  }

  // Log activity
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "RolePermission",
      entity_id: role,
      entity_name: role,
      action_type: "UPDATE",
      description: `Updated permissions for role: ${role}`,
      metadata: {
        permissions_assigned: results.length,
      },
    },
  });

  return {
    message: "Role permissions updated successfully",
    assigned: results.length,
  };
};

// ---------------- CREATE PERMISSION ----------------
const createPermission = async (req: Request) => {
  const currentUser = req.user as User;
  const { name, description, category } = req.body as {
    name: string;
    description?: string;
    category?: string;
  };

  if (!name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Permission name is required");
  }

  // Only super admin can create permissions
  if (currentUser.role !== "SUPER_ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only super admins can create permissions"
    );
  }

  // Check if permission already exists
  const existing = await prisma.permission.findUnique({
    where: { name },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "Permission already exists");
  }

  const permission = await prisma.permission.create({
    data: {
      name,
      description,
      category,
    },
  });

  // Log activity
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "Permission",
      entity_id: permission.id,
      entity_name: permission.name,
      action_type: "CREATE",
      description: `Created permission: ${permission.name}`,
    },
  });

  return permission;
};

// ---------------- DELETE PERMISSION ----------------
const deletePermission = async (id: string, req: Request) => {
  const currentUser = req.user as User;

  // Only super admin can delete permissions
  if (currentUser.role !== "SUPER_ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only super admins can delete permissions"
    );
  }

  const permission = await prisma.permission.findUnique({
    where: { id },
  });

  if (!permission) {
    throw new AppError(httpStatus.NOT_FOUND, "Permission not found");
  }

  await prisma.permission.delete({
    where: { id },
  });

  // Log activity
  await prisma.recentActivityHistory.create({
    data: {
      user_id: currentUser.id,
      entity_type: "Permission",
      entity_id: permission.id,
      entity_name: permission.name,
      action_type: "DELETE",
      description: `Deleted permission: ${permission.name}`,
    },
  });

  return permission;
};

export const permissionService = {
  getAllPermissions,
  getUserPermissionsById,
  updateUserPermissions,
  getRolePermissions,
  updateRolePermissions,
  createPermission,
  deletePermission,
};
