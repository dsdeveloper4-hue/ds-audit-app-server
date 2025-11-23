import { Response } from "express";

interface SendResponseOptions<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const sendResponse = <T>(
  res: Response,
  { statusCode, success, message, data, pagination }: SendResponseOptions<T>
): void => {
  const response: any = {
    success,
    message,
    data: data ?? null, // ensure null if undefined
  };

  // Add pagination if provided
  if (pagination) {
    response.pagination = pagination;
  }

  res.status(statusCode).json(response);
};

export default sendResponse;
