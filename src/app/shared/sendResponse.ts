import { Response } from "express";

interface SendResponseOptions<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
}

const sendResponse = <T>(
  res: Response,
  { statusCode, success, message, data }: SendResponseOptions<T>
): void => {
  res.status(statusCode).json({
    success,
    message,
    data: data ?? null, // ensure null if undefined
  });
};

export default sendResponse;
