// modules/employee/employee.route.ts
import { Router } from "express";
import { employeeController } from "./employee.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// Employee management routes - permission-based access
router.post(
    "/",
    auth(),
    checkPermission("create_employee"),
    employeeController.createEmployee
);

router.get(
    "/",
    auth(),
    checkPermission("view_employees"),
    employeeController.getAllEmployees
);

router.get(
    "/:id",
    auth(),
    checkPermission("view_employees"),
    employeeController.getEmployeeById
);

router.patch(
    "/:id",
    auth(),
    checkPermission("update_employee"),
    employeeController.updateEmployee
);

router.post(
    "/:id/deactivate",
    auth(),
    checkPermission("delete_employee"),
    employeeController.deactivateEmployee
);

export const employeeRouter: Router = router;
