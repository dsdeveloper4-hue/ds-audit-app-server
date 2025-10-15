// middlewares/roleAuth.ts
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import AppError from "@app/errors/AppError";
import { User, Role } from "@prisma/client";

/**
 * Middleware to check if the authenticated user has the required role(s)
 * @param allowedRoles - Array of roles that are allowed to access the resource
 */
const roleAuth = (allowedRoles: Role[]) => {
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

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(user.role)) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "You don't have permission to access this resource"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check user management permissions
 * - SUPER_ADMIN: Can manage all users
 * - ADMIN: Can manage users but not other admins/super_admins
 * - USER: Cannot access user management
 */
const userManagementAuth = (action: 'create' | 'read' | 'update' | 'delete') => {
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

      // USER role cannot access user management at all
      if (user.role === 'USER') {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "Users cannot access user management"
        );
      }

      // SUPER_ADMIN has full access
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }

      // ADMIN restrictions
      if (user.role === 'ADMIN') {
        // For create operations, check the role being assigned
        if (action === 'create' && req.body.role) {
          if (req.body.role === 'ADMIN' || req.body.role === 'SUPER_ADMIN') {
            throw new AppError(
              httpStatus.FORBIDDEN,
              "Admins cannot create other admins or super admins"
            );
          }
        }

        // For update/delete operations, check the target user's role
        if ((action === 'update' || action === 'delete') && req.params.id) {
          // This will be handled in the service layer where we can check the target user
          req.adminAction = action;
        }

        return next();
      }

      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't have permission to access this resource"
      );
    } catch (error) {
      next(error);
    }
  };
};

export { roleAuth, userManagementAuth };
