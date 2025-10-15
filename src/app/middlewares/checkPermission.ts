// middlewares/checkPermission.ts
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import { User } from "@prisma/client";

/**
 * Middleware to check if the authenticated user has the required permission
 * @param resource - The resource being accessed (e.g., 'audit', 'item', 'room')
 * @param action - The action being performed (e.g., 'create', 'read', 'update', 'delete')
 */
const checkPermission = (resource: string, action: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as User;

      if (!user) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Authentication required"
        );
      }

      // Get user with role and permissions
      const userWithPermissions = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!userWithPermissions) {
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
      }

      // Check if user has the required permission
      const hasPermission = userWithPermissions.role.permissions.some(
        (rp) =>
          rp.permission.resource === resource &&
          rp.permission.action === action
      );

      if (!hasPermission) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `You don't have permission to ${action} ${resource}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default checkPermission;
