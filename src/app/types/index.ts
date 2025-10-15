export * from "./config.types";
export * from "./errors.types";
export * from "./auth.types";

import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      adminAction?: 'create' | 'read' | 'update' | 'delete';
    }
  }
}
