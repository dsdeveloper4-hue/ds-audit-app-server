// middlewares/globalErrorHandler.ts
import { Request, Response, NextFunction } from "express";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { ErrorResponse } from "@app/types";



// Error-handling middleware in Express must have 4 params: (err, req, res, next)
const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(err);

  // Explicitly type as number to allow assignment of any status code
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong!";
  let success = false;
  let error: unknown = err;

  // Handle Prisma Validation Errors
  if (err instanceof PrismaClientValidationError) {
    message = "Validation Error";
    error = err.message;
    statusCode = httpStatus.BAD_REQUEST;
  }

  // Handle Prisma Known Errors
  else if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      message = "Duplicate key error";
      error = err.meta;
      statusCode = httpStatus.CONFLICT; // 409
    }
  }

  // Handle custom AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode || httpStatus.BAD_REQUEST;
    message = err.message;
    error = err.details || err.message;
  }

  const response: ErrorResponse = {
    success,
    statusCode,
    message,
    error,
  };

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
