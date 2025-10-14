// app/routes/index.ts
import { authRouter } from "@app/modules/auth/auth.route";
import { roomRouter } from "@app/modules/room/room.route";
import { itemRouter } from "@app/modules/item/item.route";
import { inventoryRouter } from "@app/modules/inventory/inventory.route";
import { auditRouter } from "@app/modules/audit/audit.route";
import { auditRecordRouter } from "@app/modules/auditRecord/auditRecord.route";
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
    path: "/rooms",
    route: roomRouter,
  },
  {
    path: "/items",
    route: itemRouter,
  },
  {
    path: "/inventories",
    route: inventoryRouter,
  },
  {
    path: "/audits",
    route: auditRouter,
  },
  {
    path: "/audit-records",
    route: auditRecordRouter,
  },
];

// Attach all routes to main router
moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
