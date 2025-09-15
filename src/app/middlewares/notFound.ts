// middlewares/notFound.ts
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";

/**
 * 404 Not Found middleware
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API Not Found!",
    error: null, // clearer than empty string
  });
};

export default notFound;
