import httpStatus from "http-status";
import prisma from "@app/lib/prisma";
import AppError from "@app/errors/AppError";

// Get all roles with permissions
const getAllRoles = async () => {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return roles;
};

// Get single role by ID
const getRoleById = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  return role;
};

// Create new role
const createRole = async (payload: { name: string; description?: string }) => {
  // Check if role with same name exists
  const existingRole = await prisma.role.findUnique({
    where: { name: payload.name },
  });

  if (existingRole) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Role with this name already exists"
    );
  }

  const role = await prisma.role.create({
    data: payload,
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return role;
};

// Update role
const updateRole = async (
  id: string,
  payload: { name?: string; description?: string }
) => {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  // Check if updating to existing name
  if (payload.name && payload.name !== role.name) {
    const existingRole = await prisma.role.findUnique({
      where: { name: payload.name },
    });

    if (existingRole) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Role with this name already exists"
      );
    }
  }

  const updatedRole = await prisma.role.update({
    where: { id },
    data: payload,
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return updatedRole;
};

// Delete role
const deleteRole = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  // Check if role has users
  if (role._count.users > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete role with ${role._count.users} assigned users`
    );
  }

  const deletedRole = await prisma.role.delete({
    where: { id },
  });

  return deletedRole;
};

// Assign permissions to role
const assignPermissions = async (
  roleId: string,
  permissionIds: string[]
) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  // Verify all permissions exist
  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (permissions.length !== permissionIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, "Some permissions not found");
  }

  // Delete existing permissions
  await prisma.rolePermission.deleteMany({
    where: { role_id: roleId },
  });

  // Create new permissions
  const rolePermissions = await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
    })),
  });

  // Return updated role with permissions
  const updatedRole = await getRoleById(roleId);
  return updatedRole;
};

// Remove single permission from role
const removePermission = async (roleId: string, permissionId: string) => {
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      role_id: roleId,
      permission_id: permissionId,
    },
  });

  if (!rolePermission) {
    throw new AppError(httpStatus.NOT_FOUND, "Permission assignment not found");
  }

  await prisma.rolePermission.delete({
    where: { id: rolePermission.id },
  });

  const updatedRole = await getRoleById(roleId);
  return updatedRole;
};

export const RoleService = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermission,
};
