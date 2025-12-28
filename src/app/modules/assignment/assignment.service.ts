// modules/assignment/assignment.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { User } from "@prisma/client";

// Supported entity types for validation
const ENTITY_VALIDATORS: Record<string, (id: string) => Promise<any>> = {
    ASSET_PURCHASE: (id) => prisma.assetPurchase.findUnique({ where: { id } }),
    ROOM: (id) => prisma.room.findUnique({ where: { id } }),
    ITEM: (id) => prisma.item.findUnique({ where: { id } }),
    // Add more entity types as needed
};

// Centralized entity validation
const validateEntity = async (entityType: string, entityId: string): Promise<void> => {
    const validator = ENTITY_VALIDATORS[entityType];
    if (!validator) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `Unknown entity type: ${entityType}. Supported types: ${Object.keys(ENTITY_VALIDATORS).join(", ")}`
        );
    }

    const entity = await validator(entityId);
    if (!entity) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            `${entityType} with ID "${entityId}" not found`
        );
    }
};

// Validate employee exists and is active
const validateEmployee = async (employeeId: string): Promise<void> => {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
    });

    if (!employee) {
        throw new AppError(httpStatus.NOT_FOUND, `Employee not found: ${employeeId}`);
    }

    if (employee.status !== "ACTIVE" && employee.status !== "ON_LEAVE") {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `Cannot assign to ${employee.status} employee: ${employee.name}`
        );
    }
};

// ASSIGN EMPLOYEES to an entity
const assignEmployees = async (req: Request) => {
    const currentUser = req.user as User;
    const { entity_type, entity_id, employee_ids, role } = req.body;

    if (!entity_type || !entity_id) {
        throw new AppError(httpStatus.BAD_REQUEST, "entity_type and entity_id are required");
    }

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
        throw new AppError(httpStatus.BAD_REQUEST, "employee_ids must be a non-empty array");
    }

    // Validate entity exists
    await validateEntity(entity_type, entity_id);

    // Validate all employees
    for (const empId of employee_ids) {
        await validateEmployee(empId);
    }

    // Get existing active assignments
    const existingAssignments = await prisma.entityAssignment.findMany({
        where: {
            entity_type,
            entity_id,
            unassigned_at: null,
            employee_id: { in: employee_ids },
        },
    });

    const existingEmployeeIds = existingAssignments.map((a) => a.employee_id);
    const newEmployeeIds = employee_ids.filter((id: string) => !existingEmployeeIds.includes(id));

    // Create new assignments only for employees not already assigned
    const newAssignments = await prisma.entityAssignment.createMany({
        data: newEmployeeIds.map((employee_id: string) => ({
            entity_type,
            entity_id,
            employee_id,
            role: role || null,
            assigned_by: currentUser.id,
        })),
    });

    // Return all active assignments for this entity
    const allAssignments = await getActiveAssignments(entity_type, entity_id);

    return {
        assigned: newAssignments.count,
        skipped: existingEmployeeIds.length,
        total: allAssignments.length,
        assignments: allAssignments,
    };
};

// UNASSIGN single employee (soft delete - preserves history)
const unassignEmployee = async (req: Request) => {
    const currentUser = req.user as User;
    const { entity_type, entity_id, employee_id } = req.body;

    if (!entity_type || !entity_id || !employee_id) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "entity_type, entity_id, and employee_id are required"
        );
    }

    // Find active assignment
    const assignment = await prisma.entityAssignment.findFirst({
        where: {
            entity_type,
            entity_id,
            employee_id,
            unassigned_at: null,
        },
    });

    if (!assignment) {
        throw new AppError(
            httpStatus.NOT_FOUND,
            "No active assignment found for this employee"
        );
    }

    // Soft delete: set unassigned_at timestamp
    const updated = await prisma.entityAssignment.update({
        where: { id: assignment.id },
        data: {
            unassigned_at: new Date(),
            unassigned_by: currentUser.id,
        },
        include: { employee: true },
    });

    return updated;
};

// UNASSIGN ALL employees from an entity
const unassignAll = async (req: Request) => {
    const currentUser = req.user as User;
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
        throw new AppError(httpStatus.BAD_REQUEST, "entity_type and entity_id are required");
    }

    const result = await prisma.entityAssignment.updateMany({
        where: {
            entity_type,
            entity_id,
            unassigned_at: null,
        },
        data: {
            unassigned_at: new Date(),
            unassigned_by: currentUser.id,
        },
    });

    return { unassigned: result.count };
};

// REASSIGN: Replace all assignments with new list
const reassignEmployees = async (req: Request) => {
    const currentUser = req.user as User;
    const { entity_type, entity_id, employee_ids, role } = req.body;

    if (!entity_type || !entity_id) {
        throw new AppError(httpStatus.BAD_REQUEST, "entity_type and entity_id are required");
    }

    // Validate entity
    await validateEntity(entity_type, entity_id);

    // Validate new employees if provided
    const newEmployeeIds = employee_ids || [];
    for (const empId of newEmployeeIds) {
        await validateEmployee(empId);
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
        // Unassign all current assignments
        await tx.entityAssignment.updateMany({
            where: {
                entity_type,
                entity_id,
                unassigned_at: null,
            },
            data: {
                unassigned_at: new Date(),
                unassigned_by: currentUser.id,
            },
        });

        // Assign new employees
        if (newEmployeeIds.length > 0) {
            await tx.entityAssignment.createMany({
                data: newEmployeeIds.map((employee_id: string) => ({
                    entity_type,
                    entity_id,
                    employee_id,
                    role: role || null,
                    assigned_by: currentUser.id,
                })),
            });
        }

        return newEmployeeIds.length;
    });

    // Return updated assignments
    const assignments = await getActiveAssignments(entity_type, entity_id);

    return {
        reassigned: result,
        assignments,
    };
};

// GET ACTIVE ASSIGNMENTS for an entity
const getActiveAssignments = async (entityType: string, entityId: string) => {
    const assignments = await prisma.entityAssignment.findMany({
        where: {
            entity_type: entityType,
            entity_id: entityId,
            unassigned_at: null, // Active only
        },
        include: {
            employee: {
                select: {
                    id: true,
                    employee_id: true,
                    name: true,
                    email: true,
                    designation: true,
                    department: true,
                    status: true,
                },
            },
        },
        orderBy: { assigned_at: "asc" },
    });

    return assignments;
};

// GET ASSIGNMENTS (with query params)
const getAssignments = async (req: Request) => {
    const { entity_type, entity_id, include_history } = req.query;

    if (!entity_type || !entity_id) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "entity_type and entity_id query params are required"
        );
    }

    const where: any = {
        entity_type: entity_type as string,
        entity_id: entity_id as string,
    };

    // By default, only return active assignments
    if (include_history !== "true") {
        where.unassigned_at = null;
    }

    const assignments = await prisma.entityAssignment.findMany({
        where,
        include: {
            employee: {
                select: {
                    id: true,
                    employee_id: true,
                    name: true,
                    email: true,
                    designation: true,
                    department: true,
                    status: true,
                },
            },
        },
        orderBy: { assigned_at: "desc" },
    });

    return assignments;
};

// GET ALL ASSIGNMENTS for an employee
const getEmployeeAssignments = async (req: Request) => {
    const { employee_id } = req.params;
    const { active_only } = req.query;

    if (!employee_id) {
        throw new AppError(httpStatus.BAD_REQUEST, "employee_id is required");
    }

    const where: any = { employee_id };
    if (active_only === "true") {
        where.unassigned_at = null;
    }

    const assignments = await prisma.entityAssignment.findMany({
        where,
        orderBy: { assigned_at: "desc" },
    });

    return assignments;
};

// GET ASSIGNMENT BY ID
const getAssignmentById = async (id: string) => {
    const assignment = await prisma.entityAssignment.findUnique({
        where: { id },
        include: { employee: true },
    });

    if (!assignment) {
        throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
    }

    return assignment;
};

// DELETE ASSIGNMENT (hard delete - for cleanup only)
const deleteAssignment = async (id: string) => {
    const assignment = await prisma.entityAssignment.findUnique({ where: { id } });
    if (!assignment) {
        throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
    }

    await prisma.entityAssignment.delete({ where: { id } });
    return { deleted: true };
};

export const assignmentService = {
    assignEmployees,
    unassignEmployee,
    unassignAll,
    reassignEmployees,
    getAssignments,
    getActiveAssignments,
    getEmployeeAssignments,
    getAssignmentById,
    deleteAssignment,
    validateEntity,
};
