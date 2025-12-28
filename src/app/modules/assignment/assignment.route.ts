// modules/assignment/assignment.route.ts
import { Router } from "express";
import { assignmentController } from "./assignment.controller";
import auth from "@app/middlewares/auth";
import { checkPermission } from "@app/middlewares/checkPermission";

const router = Router();

// GET assignments - requires view permission
router.get(
    "/",
    auth(),
    checkPermission("view_assignments"),
    assignmentController.getAssignments
);

// GET assignments for a specific employee
router.get(
    "/employee/:employee_id",
    auth(),
    checkPermission("view_assignments"),
    assignmentController.getEmployeeAssignments
);

// GET single assignment by ID
router.get(
    "/:id",
    auth(),
    checkPermission("view_assignments"),
    assignmentController.getAssignmentById
);

// POST - Assign employees to entity
router.post(
    "/",
    auth(),
    checkPermission("manage_assignments"),
    assignmentController.assign
);

// PUT - Reassign (replace all assignments for entity)
router.put(
    "/reassign",
    auth(),
    checkPermission("manage_assignments"),
    assignmentController.reassign
);

// DELETE - Unassign single employee
router.delete(
    "/unassign",
    auth(),
    checkPermission("manage_assignments"),
    assignmentController.unassign
);

// DELETE - Unassign all employees from entity
router.delete(
    "/unassign-all",
    auth(),
    checkPermission("manage_assignments"),
    assignmentController.unassignAll
);

// DELETE - Hard delete assignment (admin cleanup)
router.delete(
    "/:id",
    auth(),
    checkPermission("manage_assignments"),
    assignmentController.deleteAssignment
);

export const assignmentRouter: Router = router;
