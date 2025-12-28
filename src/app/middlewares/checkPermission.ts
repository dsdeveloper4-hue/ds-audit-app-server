// middlewares/checkPermission.ts
import { Request, Response, NextFunction } from "express";
import { User } from "@prisma/client";
import prisma from "@app/lib/prisma";
import AppError from "@app/errors/AppError";
import httpStatus from "http-status";

/**
 * Middleware to check if user has specific permission(s)
 * Usage: checkPermission('create_audit') or checkPermission(['create_audit', 'edit_audit'])
 */
export const checkPermission = (requiredPermissions: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      // Convert to array if single permission
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check if user has the required permissions
      const hasPermission = await checkUserPermissions(
        user.id,
        user.role,
        permissions
      );

      if (!hasPermission) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `You don't have permission to perform this action. Required: ${permissions.join(
            ", "
          )}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has specific permissions
 * Checks both role-based permissions and user-specific permissions
 */
export async function checkUserPermissions(
  userId: string,
  userRole: string,
  requiredPermissions: string[]
): Promise<boolean> {
  // SUPER_ADMIN short-circuit - always has all permissions (no DB lookup needed)
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  // Get all permissions for this user
  const userPermissions = await getUserPermissions(userId, userRole);

  // Check for wildcard permission (defense in depth)
  if (userPermissions.includes("*")) {
    return true;
  }

  // Check if user has all required permissions
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Get all permissions for a user (role-based + user-specific)
 */
export async function getUserPermissions(
  userId: string,
  userRole: string
): Promise<string[]> {
  // SUPER_ADMIN has all permissions - return wildcard to avoid DB lookup
  if (userRole === "SUPER_ADMIN") {
    return ["*"]; // Wildcard represents all permissions
  }

  // Get role-based permissions
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: userRole as any },
    include: { permission: true },
  });

  const rolePermissionNames = rolePermissions.map((rp) => rp.permission.name);

  // Get user-specific permissions (overrides)
  const userPermissions = await prisma.userPermission.findMany({
    where: { user_id: userId },
    include: { permission: true },
  });

  // Build final permission set
  const permissionSet = new Set(rolePermissionNames);

  // Apply user-specific overrides
  userPermissions.forEach((up) => {
    if (up.granted) {
      permissionSet.add(up.permission.name);
    } else {
      permissionSet.delete(up.permission.name);
    }
  });

  return Array.from(permissionSet);
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export const checkAnyPermission = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
      }

      // Get all permissions for this user
      const userPermissions = await getUserPermissions(user.id, user.role);

      // Check if user has at least one of the required permissions
      const hasAnyPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `You don't have permission to perform this action. Required one of: ${requiredPermissions.join(
            ", "
          )}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
