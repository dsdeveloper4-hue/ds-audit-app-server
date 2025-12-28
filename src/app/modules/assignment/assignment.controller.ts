// modules/assignment/assignment.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { assignmentService } from "./assignment.service";

// POST /assignments - Assign employees to entity
const assign = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.assignEmployees(req);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: `${result.assigned} employee(s) assigned successfully`,
        data: result,
    });
});

// DELETE /assignments/unassign - Unassign single employee
const unassign = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.unassignEmployee(req);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employee unassigned successfully",
        data: result,
    });
});

// DELETE /assignments/unassign-all - Unassign all employees from entity
const unassignAll = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.unassignAll(req);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `${result.unassigned} assignment(s) removed`,
        data: result,
    });
});

// PUT /assignments/reassign - Replace all assignments
const reassign = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.reassignEmployees(req);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Reassigned to ${result.reassigned} employee(s)`,
        data: result,
    });
});

// GET /assignments?entity_type=X&entity_id=Y - Get assignments
const getAssignments = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.getAssignments(req);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Assignments retrieved successfully",
        data: result,
    });
});

// GET /assignments/employee/:employee_id - Get all assignments for employee
const getEmployeeAssignments = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.getEmployeeAssignments(req);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employee assignments retrieved successfully",
        data: result,
    });
});

// GET /assignments/:id - Get single assignment
const getAssignmentById = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.getAssignmentById(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Assignment retrieved successfully",
        data: result,
    });
});

// DELETE /assignments/:id - Hard delete (admin cleanup)
const deleteAssignment = catchAsync(async (req: Request, res: Response) => {
    const result = await assignmentService.deleteAssignment(req.params.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Assignment deleted permanently",
        data: result,
    });
});

export const assignmentController = {
    assign,
    unassign,
    unassignAll,
    reassign,
    getAssignments,
    getEmployeeAssignments,
    getAssignmentById,
    deleteAssignment,
};
