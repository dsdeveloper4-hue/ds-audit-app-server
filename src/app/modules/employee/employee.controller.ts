// modules/employee/employee.controller.ts
import { Request, Response } from "express";
import catchAsync from "@app/shared/catchAsync";
import sendResponse from "@app/shared/sendResponse";
import httpStatus from "http-status";
import { employeeService } from "./employee.service";

// CREATE EMPLOYEE
const createEmployee = catchAsync(async (req: Request, res: Response) => {
    const employee = await employeeService.createEmployee(req);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Employee created successfully",
        data: employee,
    });
});

// GET ALL EMPLOYEES
const getAllEmployees = catchAsync(async (req: Request, res: Response) => {
    const employees = await employeeService.getAllEmployees(req);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employees retrieved successfully",
        data: employees,
    });
});

// GET EMPLOYEE BY ID
const getEmployeeById = catchAsync(async (req: Request, res: Response) => {
    const employee = await employeeService.getEmployeeById(req.params.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employee retrieved successfully",
        data: employee,
    });
});

// UPDATE EMPLOYEE
const updateEmployee = catchAsync(async (req: Request, res: Response) => {
    const employee = await employeeService.updateEmployee(req.params.id, req);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employee updated successfully",
        data: employee,
    });
});

// DEACTIVATE EMPLOYEE
const deactivateEmployee = catchAsync(async (req: Request, res: Response) => {
    const employee = await employeeService.deactivateEmployee(req.params.id, req);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Employee deactivated successfully",
        data: employee,
    });
});

export const employeeController = {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deactivateEmployee,
};
