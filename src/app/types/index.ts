export * from "./config.types";
export * from "./errors.types";
export * from "./auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: unknown; // You can replace `unknown` with your Prisma user type
    }
  }
}
