// modules/audit/audit.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Audit } from "@prisma/client";

// ---------------- CREATE AUDIT ----------------
// This automatically creates audit records for ALL existing inventory items
// All values start at 0 and will be updated by the user during the audit
const createAudit = async (req: Request): Promise<any> => {
  const { month, year, notes, conducted_by } = req.body as {
    month: number;
    year: number;
    notes?: string;
    conducted_by?: string;
  };

  // Validate required fields
  if (!month || !year) {
    throw new AppError(httpStatus.BAD_REQUEST, "Month and year are required");
  }

  // Validate month range
  if (month < 1 || month > 12) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Month must be between 1 and 12"
    );
  }

  // Check if audit already exists for this month/year
  const existingAudit = await prisma.audit.findUnique({
    where: {
      month_year: {
        month,
        year,
      },
    },
  });

  if (existingAudit) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Audit for ${month}/${year} already exists`
    );
  }

  // Verify user exists if conducted_by is provided
  if (conducted_by) {
    const user = await prisma.user.findUnique({ where: { id: conducted_by } });
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "Conductor user not found");
    }
  }

  // Get all existing inventory records
  const inventories = await prisma.inventory.findMany({
    include: {
      room: true,
      item: true,
    },
  });

  if (inventories.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No inventory found. Please create inventory records first."
    );
  }

  // Create audit and audit records in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the audit
    const audit = await tx.audit.create({
      data: {
        month,
        year,
        notes,
        conducted_by,
        status: "in_progress",
      },
    });

    // Create audit records for ALL inventory items
    // All recorded values start at 0
    const auditRecords = await Promise.all(
      inventories.map((inventory) =>
        tx.auditRecord.create({
          data: {
            audit_id: audit.id,
            inventory_id: inventory.id,
            recorded_current: 0,
            recorded_active: 0,
            recorded_broken: 0,
            recorded_inactive: 0,
          },
          include: {
            inventory: {
              include: {
                room: true,
                item: true,
              },
            },
          },
        })
      )
    );

    return {
      audit,
      auditRecords,
      totalRecords: auditRecords.length,
    };
  });

  return result;
};

// ---------------- GET ALL AUDITS ----------------
const getAllAudits = async (): Promise<Audit[]> => {
  const audits = await prisma.audit.findMany({
    include: {
      conductor: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      _count: {
        select: { records: true },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return audits;
};

// ---------------- GET AUDIT BY ID ----------------
const getAuditById = async (id: string): Promise<any> => {
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      conductor: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      records: {
        include: {
          inventory: {
            include: {
              room: true,
              item: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  mobile: true,
                },
              },
            },
          },
        },
        orderBy: [
          { inventory: { room: { name: "asc" } } },
          { inventory: { item: { name: "asc" } } },
        ],
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Group records by room for better organization
  const recordsByRoom = audit.records.reduce((acc: any, record: any) => {
    const roomName = record.inventory.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        room: record.inventory.room,
        records: [],
      };
    }
    acc[roomName].records.push(record);
    return acc;
  }, {});

  return {
    ...audit,
    recordsByRoom: Object.values(recordsByRoom),
  };
};

// ---------------- UPDATE AUDIT ----------------
const updateAudit = async (id: string, req: Request): Promise<Audit> => {
  const { status, notes, conducted_by } = req.body as {
    status?: string;
    notes?: string;
    conducted_by?: string;
  };

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Verify user exists if conducted_by is provided
  if (conducted_by) {
    const user = await prisma.user.findUnique({ where: { id: conducted_by } });
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "Conductor user not found");
    }
  }

  // Validate status
  if (status && !["in_progress", "completed", "reviewed"].includes(status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Status must be in_progress, completed, or reviewed"
    );
  }

  const updatedAudit = await prisma.audit.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(conducted_by !== undefined && { conducted_by }),
    },
    include: {
      conductor: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      _count: {
        select: { records: true },
      },
    },
  });

  return updatedAudit;
};

// ---------------- COMPLETE AUDIT ----------------
// When audit is completed, update inventory with the recorded values
const completeAudit = async (id: string): Promise<any> => {
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      records: {
        include: {
          inventory: true,
        },
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  if (audit.status === "completed") {
    throw new AppError(httpStatus.BAD_REQUEST, "Audit is already completed");
  }

  // Update audit status and inventory in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update each inventory with the recorded values from audit
    const updatedInventories = await Promise.all(
      audit.records.map((record) =>
        tx.inventory.update({
          where: { id: record.inventory_id },
          data: {
            current_quantity: record.recorded_current,
            active_quantity: record.recorded_active,
            broken_quantity: record.recorded_broken,
            inactive_quantity: record.recorded_inactive,
          },
        })
      )
    );

    // Mark audit as completed
    const completedAudit = await tx.audit.update({
      where: { id },
      data: {
        status: "completed",
      },
      include: {
        conductor: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    return {
      audit: completedAudit,
      updatedInventories: updatedInventories.length,
    };
  });

  return result;
};

// ---------------- DELETE AUDIT ----------------
const deleteAudit = async (id: string): Promise<Audit> => {
  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Can only delete if status is in_progress
  if (audit.status === "completed" || audit.status === "reviewed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete a completed or reviewed audit"
    );
  }

  const deletedAudit = await prisma.audit.delete({
    where: { id },
  });

  return deletedAudit;
};

export const auditService = {
  createAudit,
  getAllAudits,
  getAuditById,
  updateAudit,
  completeAudit,
  deleteAudit,
};
