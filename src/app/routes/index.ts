// app/routes/index.ts
import { authRouter } from "@app/modules/auth/auth.route";
import { userRouter } from "@app/modules/user/user.route";
import { roomRouter } from "@app/modules/room/room.route";
import { itemRouter } from "@app/modules/item/item.route";
import { itemDetailsRouter } from "@app/modules/itemDetails/itemDetails.route";
import { auditRouter } from "@app/modules/audit/audit.route";
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
    path: "/item-details",
    route: itemDetailsRouter,
  },
  {
    path: "/audits",
    route: auditRouter,
  },
];

// Attach all routes to main router
moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
