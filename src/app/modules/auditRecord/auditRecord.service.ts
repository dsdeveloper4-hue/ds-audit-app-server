// modules/auditRecord/auditRecord.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { AuditRecord } from "@prisma/client";

// ---------------- GET AUDIT RECORD BY ID ----------------
const getAuditRecordById = async (id: string): Promise<any> => {
  const record = await prisma.auditRecord.findUnique({
    where: { id },
    include: {
      audit: true,
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
  });

  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit record not found");
  }

  return record;
};

// ---------------- GET AUDIT RECORDS BY AUDIT ID ----------------
const getAuditRecordsByAuditId = async (audit_id: string): Promise<any[]> => {
  const audit = await prisma.audit.findUnique({ where: { id: audit_id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  const records = await prisma.auditRecord.findMany({
    where: { audit_id },
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
  });

  return records;
};

// ---------------- UPDATE AUDIT RECORD ----------------
// This is where users update the values during the audit process
const updateAuditRecord = async (
  id: string,
  req: Request
): Promise<AuditRecord> => {
  const {
    recorded_current,
    recorded_active,
    recorded_broken,
    recorded_inactive,
    notes,
  } = req.body as {
    recorded_current?: number;
    recorded_active?: number;
    recorded_broken?: number;
    recorded_inactive?: number;
    notes?: string;
  };

  // Get the audit record with audit info
  const record = await prisma.auditRecord.findUnique({
    where: { id },
    include: { audit: true },
  });

  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit record not found");
  }

  // Check if audit is still in progress
  if (record.audit.status === "completed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot update a completed audit record"
    );
  }

  if (record.audit.status === "reviewed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot update a reviewed audit record"
    );
  }

  // Validate that recorded values are non-negative
  if (
    (recorded_current !== undefined && recorded_current < 0) ||
    (recorded_active !== undefined && recorded_active < 0) ||
    (recorded_broken !== undefined && recorded_broken < 0) ||
    (recorded_inactive !== undefined && recorded_inactive < 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Recorded values cannot be negative"
    );
  }

  const updatedRecord = await prisma.auditRecord.update({
    where: { id },
    data: {
      ...(recorded_current !== undefined && { recorded_current }),
      ...(recorded_active !== undefined && { recorded_active }),
      ...(recorded_broken !== undefined && { recorded_broken }),
      ...(recorded_inactive !== undefined && { recorded_inactive }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      audit: true,
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
  });

  return updatedRecord;
};

// ---------------- BULK UPDATE AUDIT RECORDS ----------------
// Update multiple audit records at once
const bulkUpdateAuditRecords = async (req: Request): Promise<any> => {
  const { records } = req.body as {
    records: Array<{
      id: string;
      recorded_current?: number;
      recorded_active?: number;
      recorded_broken?: number;
      recorded_inactive?: number;
      notes?: string;
    }>;
  };

  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Records array is required and must not be empty"
    );
  }

  // Validate all records exist and belong to the same audit
  const recordIds = records.map((r) => r.id);
  const existingRecords = await prisma.auditRecord.findMany({
    where: { id: { in: recordIds } },
    include: { audit: true },
  });

  if (existingRecords.length !== records.length) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "One or more audit records not found"
    );
  }

  // Check all records belong to same audit and audit is in progress
  const auditIds = new Set(existingRecords.map((r) => r.audit_id));
  if (auditIds.size > 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "All records must belong to the same audit"
    );
  }

  const audit = existingRecords[0].audit;
  if (audit.status === "completed" || audit.status === "reviewed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot update records of a ${audit.status} audit`
    );
  }

  // Update all records in a transaction
  const updatedRecords = await prisma.$transaction(
    records.map((record) =>
      prisma.auditRecord.update({
        where: { id: record.id },
        data: {
          ...(record.recorded_current !== undefined && {
            recorded_current: record.recorded_current,
          }),
          ...(record.recorded_active !== undefined && {
            recorded_active: record.recorded_active,
          }),
          ...(record.recorded_broken !== undefined && {
            recorded_broken: record.recorded_broken,
          }),
          ...(record.recorded_inactive !== undefined && {
            recorded_inactive: record.recorded_inactive,
          }),
          ...(record.notes !== undefined && { notes: record.notes }),
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
    updatedCount: updatedRecords.length,
    records: updatedRecords,
  };
};

// ---------------- ADD PARTICIPANT TO AUDIT RECORD ----------------
const addParticipant = async (
  record_id: string,
  req: Request
): Promise<any> => {
  const { user_id } = req.body as { user_id: string };

  if (!user_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "User ID is required");
  }

  // Check if record exists
  const record = await prisma.auditRecord.findUnique({
    where: { id: record_id },
  });
  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit record not found");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: user_id } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if participant already exists
  const existingParticipant = await prisma.auditRecordParticipant.findUnique({
    where: {
      audit_record_id_user_id: {
        audit_record_id: record_id,
        user_id,
      },
    },
  });

  if (existingParticipant) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User is already a participant in this audit record"
    );
  }

  const participant = await prisma.auditRecordParticipant.create({
    data: {
      audit_record_id: record_id,
      user_id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
  });

  return participant;
};

// ---------------- REMOVE PARTICIPANT FROM AUDIT RECORD ----------------
const removeParticipant = async (
  record_id: string,
  user_id: string
): Promise<any> => {
  const participant = await prisma.auditRecordParticipant.findUnique({
    where: {
      audit_record_id_user_id: {
        audit_record_id: record_id,
        user_id,
      },
    },
  });

  if (!participant) {
    throw new AppError(httpStatus.NOT_FOUND, "Participant not found");
  }

  await prisma.auditRecordParticipant.delete({
    where: {
      audit_record_id_user_id: {
        audit_record_id: record_id,
        user_id,
      },
    },
  });

  return { message: "Participant removed successfully" };
};

export const auditRecordService = {
  getAuditRecordById,
  getAuditRecordsByAuditId,
  updateAuditRecord,
  bulkUpdateAuditRecords,
  addParticipant,
  removeParticipant,
};
