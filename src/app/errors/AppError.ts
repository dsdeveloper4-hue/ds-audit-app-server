// AppError.ts
class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(
    statusCode: number,
    message: string,
    details: unknown = null,
    stack = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace (only available on V8)
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly (important when extending built-ins in TS)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export default AppError;
