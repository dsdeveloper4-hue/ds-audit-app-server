// middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import { CustomJwtPayload } from "@app/types";

const auth = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      // 1️⃣ Check if header exists
      if (!authHeader) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Authorization header is missing."
        );
      }

      // 2️⃣ Check Bearer token format
      if (!authHeader.startsWith("Bearer ")) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid authorization format. Expected 'Bearer <token>'."
        );
      }

      // 3️⃣ Extract token
      const token = authHeader.split(" ")[1];
      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Token is missing.");
      }

      // 4️⃣ Verify token
      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as CustomJwtPayload;

      const { id, iat } = decoded;

      // 5️⃣ Check if user exists in DB
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, "User not found.");
      }

      // 7️⃣ Attach user info to request
      req.user = user;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
