// modules/employee/employee.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { User, EmployeeStatus } from "@prisma/client";

const EMPLOYEE_ID_REGEX = /^DS.+$/;

// Validate employee_id format
const validateEmployeeIdFormat = (employee_id: string): void => {
    if (!EMPLOYEE_ID_REGEX.test(employee_id)) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Invalid Employee ID format. Must start with DS (e.g., DS-1, DSDA-01)"
        );
    }
};

// Check uniqueness (case-insensitive)
const validateEmployeeUniqueness = async (
    employee_id: string,
    email: string,
    excludeId?: string
): Promise<void> => {
    const existing = await prisma.employee.findFirst({
        where: {
            AND: [
                ...(excludeId ? [{ id: { not: excludeId } }] : []),
                {
                    OR: [
                        {
                            employee_id: {
                                equals: employee_id,
                                mode: "insensitive" as const,
                            },
                        },
                        { email: { equals: email, mode: "insensitive" as const } },
                    ],
                },
            ],
        },
    });

    if (existing) {
        const field =
            existing.employee_id.toLowerCase() === employee_id.toLowerCase()
                ? "employee_id"
                : "email";
        throw new AppError(
            httpStatus.CONFLICT,
            field === "employee_id"
                ? `Employee ID "${employee_id}" already exists`
                : `Email "${email}" already in use`
        );
    }
};

// CREATE EMPLOYEE
const createEmployee = async (req: Request) => {
    const currentUser = req.user as User;
    const {
        employee_id,
        name,
        email,
        joining_date,
        department,
        designation,
        workplace,
        employment_type,
    } = req.body;

    if (!employee_id || !name || !email) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Employee ID, name, and email are required"
        );
    }

    // Validate format
    validateEmployeeIdFormat(employee_id);

    // Validate uniqueness
    await validateEmployeeUniqueness(employee_id, email);

    const employee = await prisma.employee.create({
        data: {
            employee_id,
            name,
            email,
            joining_date: joining_date ? new Date(joining_date) : undefined,
            department,
            designation,
            workplace,
            employment_type,
            status: "ACTIVE",
        },
    });

    // Log creation
    await prisma.recentActivityHistory.create({
        data: {
            user_id: currentUser.id,
            entity_type: "Employee",
            entity_id: employee.id,
            entity_name: employee.name,
            action_type: "CREATE",
            after: employee,
            description: `Created employee: ${employee.name} (${employee.employee_id})`,
        },
    });

    return employee;
};

// GET ALL EMPLOYEES
const getAllEmployees = async (req: Request) => {
    const { status, search } = req.query;

    const where: any = {};

    // Filter by status (default: ACTIVE and ON_LEAVE for dropdowns)
    if (status) {
        const statuses = (status as string).split(",") as EmployeeStatus[];
        where.status = { in: statuses };
    } else {
        // Default: only assignable employees
        where.status = { in: ["ACTIVE", "ON_LEAVE"] };
    }

    // Search
    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: "insensitive" } },
            { employee_id: { contains: search as string, mode: "insensitive" } },
            { email: { contains: search as string, mode: "insensitive" } },
        ];
    }

    const employees = await prisma.employee.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { assetPurchases: true },
            },
        },
    });

    return employees;
};

// GET EMPLOYEE BY ID
const getEmployeeById = async (id: string) => {
    const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
            _count: {
                select: { assetPurchases: true },
            },
        },
    });

    if (!employee) {
        throw new AppError(httpStatus.NOT_FOUND, "Employee not found");
    }

    return employee;
};

// UPDATE EMPLOYEE
const updateEmployee = async (id: string, req: Request) => {
    const currentUser = req.user as User;
    const {
        employee_id,
        name,
        email,
        joining_date,
        department,
        designation,
        workplace,
        employment_type,
    } = req.body;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(httpStatus.NOT_FOUND, "Employee not found");
    }

    // Check if employee_id is being changed
    if (employee_id && employee_id !== existing.employee_id) {
        // Validate format
        validateEmployeeIdFormat(employee_id);

        // Count assigned assets
        const assignedAssets = await prisma.assetPurchase.count({
            where: { assigned_employee_id: id },
        });

        if (assignedAssets > 0) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                `Cannot change Employee ID: ${assignedAssets} assets assigned. Unassign assets first.`
            );
        }

        // Validate uniqueness
        await validateEmployeeUniqueness(employee_id, existing.email, id);
    }

    // Validate email uniqueness if changed
    if (email && email !== existing.email) {
        await validateEmployeeUniqueness(existing.employee_id, email, id);
    }

    const updated = await prisma.employee.update({
        where: { id },
        data: {
            ...(employee_id && { employee_id }),
            ...(name && { name }),
            ...(email && { email }),
            ...(joining_date !== undefined && {
                joining_date: joining_date ? new Date(joining_date) : null,
            }),
            ...(department !== undefined && { department }),
            ...(designation !== undefined && { designation }),
            ...(workplace !== undefined && { workplace }),
            ...(employment_type !== undefined && { employment_type }),
        },
    });

    // Log update
    await prisma.recentActivityHistory.create({
        data: {
            user_id: currentUser.id,
            entity_type: "Employee",
            entity_id: id,
            entity_name: updated.name,
            action_type: "UPDATE",
            before: existing,
            after: updated,
            description: `Updated employee: ${updated.name}`,
        },
    });

    return updated;
};

// DEACTIVATE EMPLOYEE (soft delete)
const deactivateEmployee = async (id: string, req: Request) => {
    const currentUser = req.user as User;
    const { status: newStatus, status_reason } = req.body as {
        status: EmployeeStatus;
        status_reason?: string;
    };

    if (!newStatus || !["INACTIVE", "RESIGNED", "ON_LEAVE"].includes(newStatus)) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Valid status required (INACTIVE, RESIGNED, or ON_LEAVE)"
        );
    }

    // Check assigned assets
    const assetCount = await prisma.assetPurchase.count({
        where: { assigned_employee_id: id },
    });

    if (assetCount > 0) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            `Employee has ${assetCount} assigned assets. Transfer or unassign before deactivating.`
        );
    }

    const before = await prisma.employee.findUnique({ where: { id } });
    if (!before) {
        throw new AppError(httpStatus.NOT_FOUND, "Employee not found");
    }

    const employee = await prisma.employee.update({
        where: { id },
        data: {
            status: newStatus,
            status_reason,
            status_changed_at: new Date(),
        },
    });

    // Log deactivation
    await prisma.recentActivityHistory.create({
        data: {
            user_id: currentUser.id,
            entity_type: "Employee",
            entity_id: id,
            entity_name: employee.name,
            action_type: "UPDATE",
            before: { status: before.status },
            after: { status: newStatus, status_reason },
            description: `Deactivated employee: ${employee.name} → ${newStatus}`,
        },
    });

    return employee;
};

// DELETE EMPLOYEE (throws error - not allowed)
const deleteEmployee = async () => {
    throw new AppError(
        httpStatus.BAD_REQUEST,
        "Employees cannot be deleted. Use deactivate instead."
    );
};

export const employeeService = {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deactivateEmployee,
    deleteEmployee,
};
