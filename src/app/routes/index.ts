// app/routes/index.ts
import { authRouter } from "@app/modules/auth/auth.route";
import { userRouter } from "@app/modules/user/user.route";
import { roomRouter } from "@app/modules/room/room.route";
import { itemRouter } from "@app/modules/item/item.route";
import { auditRouter } from "@app/modules/audit/audit.route";
import { RoleRoutes } from "@app/modules/role/role.route";
import { PermissionRoutes } from "@app/modules/permission/permission.route";
import { Router } from "express";

const router = Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/users",
    route: userRouter,
  },
  {
    path: "/rooms",
    route: roomRouter,
  },
  {
    path: "/items",
    route: itemRouter,
  },
  {
    path: "/audits",
    route: auditRouter,
  },
  {
    path: "/roles",
    route: RoleRoutes,
  },
  {
    path: "/permissions",
    route: PermissionRoutes,
  },
];

// Attach all routes to main router
moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
