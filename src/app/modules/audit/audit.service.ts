// modules/audit/audit.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Audit, User } from "@prisma/client";

// ---------------- CREATE AUDIT ----------------
// Creates an audit for a specific month/year
const createAudit = async (req: Request): Promise<any> => {
  const user = req.user as User;
  const { month, year, notes, participant_ids } = req.body as {
    month: number;
    year: number;
    notes?: string;
    participant_ids?: string[];
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

  // Verify participants exist if provided
  if (participant_ids && participant_ids.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: participant_ids } },
    });
    if (users.length !== participant_ids.length) {
      throw new AppError(httpStatus.NOT_FOUND, "One or more participants not found");
    }
  }

  // Create the audit with participants
  const audit = await prisma.audit.create({
    data: {
      month,
      year,
      notes,
      status: "IN_PROGRESS",
      participants: participant_ids
        ? {
            connect: participant_ids.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      _count: {
        select: { itemDetails: true },
      },
    },
  });

  // Log audit creation in history
  const participantCount = audit.participants?.length || 0;
  const participantInfo = participantCount > 0 ? ` with ${participantCount} participant${participantCount > 1 ? 's' : ''}` : '';

  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Audit",
      entity_id: audit.id,
      entity_name: `Audit ${month}/${year}`,
      action_type: "CREATE",
      after: audit,
      description: `Audit created for ${month}/${year} (Status: ${audit.status}${participantInfo})`,
    },
  });

  return audit;
};

// ---------------- GET ALL AUDITS ----------------
const getAllAudits = async (): Promise<Audit[]> => {
  const audits = await prisma.audit.findMany({
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      _count: {
        select: { itemDetails: true },
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
      participants: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
        orderBy: [
          { room: { name: "asc" } },
          { item: { name: "asc" } },
        ],
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Fetch history for this audit from RecentActivityHistory
  const history = await prisma.recentActivityHistory.findMany({
    where: {
      OR: [
        { entity_type: "Audit", entity_id: id },
        { entity_type: "ItemDetails", metadata: { path: ["audit_id"], equals: id } },
      ],
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
    orderBy: {
      occurred_at: "desc",
    },
  });

  // Group item details by room for better organization
  const detailsByRoom = audit.itemDetails.reduce((acc: any, detail: any) => {
    const roomName = detail.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        room: detail.room,
        items: [],
      };
    }
    acc[roomName].items.push(detail);
    return acc;
  }, {});

  return {
    ...audit,
    history,
    detailsByRoom: Object.values(detailsByRoom),
  };
};

// ---------------- GET LATEST AUDIT ----------------
const getLatestAudit = async (): Promise<any> => {
  const audit = await prisma.audit.findFirst({
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
        orderBy: [
          { room: { name: "asc" } },
          { item: { name: "asc" } },
        ],
      },
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { created_at: "desc" },
    ],
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "No audits found");
  }

  const history = await prisma.recentActivityHistory.findMany({
    where: {
      OR: [
        { entity_type: "Audit", entity_id: audit.id },
        {
          entity_type: "ItemDetails",
          metadata: { path: ["audit_id"], equals: audit.id },
        },
      ],
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
    orderBy: {
      occurred_at: "desc",
    },
  });

  const detailsByRoom = audit.itemDetails.reduce((acc: any, detail: any) => {
    const roomName = detail.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        room: detail.room,
        items: [],
      };
    }
    acc[roomName].items.push(detail);
    return acc;
  }, {} as Record<string, any>);

  return {
    ...audit,
    history,
    detailsByRoom: Object.values(detailsByRoom),
  };
};

// ---------------- UPDATE AUDIT ----------------
const updateAudit = async (id: string, req: Request): Promise<Audit> => {
  const user = req.user as User;
  const { status, notes, participant_ids } = req.body as {
    status?: string;
    notes?: string;
    participant_ids?: string[];
  };

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Verify participants exist if provided and not empty
  if (participant_ids && participant_ids.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: participant_ids } },
    });
    if (users.length !== participant_ids.length) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "One or more participants not found"
      );
    }
  }

  // Validate status
  if (status && !["IN_PROGRESS", "COMPLETED", "CANCELED"].includes(status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Status must be IN_PROGRESS, COMPLETED, or CANCELED"
    );
  }

  const before = {
    status: audit.status,
    notes: audit.notes,
  };
  const oldStatus = audit.status;

  // --- Prepare clean update data ---
  const updateData: any = {};

  if (status && status.trim() !== "") updateData.status = status as any;
  if (notes && notes.trim() !== "") updateData.notes = notes;
  if (participant_ids && participant_ids.length > 0) {
    updateData.participants = {
      set: participant_ids.map((id) => ({ id })),
    };
  }

  // If there's nothing to update, just return the existing audit
  if (Object.keys(updateData).length === 0) {
    return audit;
  }

  const updatedAudit = await prisma.audit.update({
    where: { id },
    data: updateData,
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      _count: {
        select: { itemDetails: true },
      },
    },
  });

  // --- Build change log (ignore empty or unchanged fields) ---
  const changes: string[] = [];

  if (status && status.trim() !== "" && status !== oldStatus) {
    changes.push(`Status: ${oldStatus} → ${status}`);
  }
  if (notes && notes.trim() !== "" && notes !== audit.notes) {
    changes.push(`Notes updated`);
  }
  if (participant_ids && participant_ids.length > 0) {
    changes.push(`Participants updated`);
  }

  // --- Only create history if there are real changes ---
  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "Audit",
        entity_id: audit.id,
        entity_name: `Audit ${audit.month}/${audit.year}`,
        action_type: "UPDATE",
        before,
        after: {
          status: updatedAudit.status,
          notes: updatedAudit.notes,
        },
        change_summary: { changes },
        description: `Audit updated: ${changes.join(", ")}`,
      },
    });
  }

  return updatedAudit;
};


// ---------------- ADD ITEM DETAIL TO AUDIT ----------------
// Add a new item detail (room-item combination) to an existing audit
const addItemDetailToAudit = async (
  audit_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;
  const { room_id, item_id, active_quantity, broken_quantity, inactive_quantity } = req.body as {
    room_id: string;
    item_id: string;
    active_quantity?: number;
    broken_quantity?: number;
    inactive_quantity?: number;
  };

  if (!room_id || !item_id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room ID and Item ID are required"
    );
  }

  // Check if audit exists and is in progress
  const audit = await prisma.audit.findUnique({ where: { id: audit_id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  if (audit.status !== "IN_PROGRESS") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Can only add items to audits that are in progress"
    );
  }

  // Check if room exists
  const room = await prisma.room.findUnique({ where: { id: room_id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Check if item exists
  const item = await prisma.item.findUnique({ where: { id: item_id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  // Check if this combination already exists in the audit
  const existing = await prisma.itemDetails.findUnique({
    where: {
      room_id_item_id_audit_id: {
        room_id,
        item_id,
        audit_id,
      },
    },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This room-item combination already exists in the audit"
    );
  }

  const itemDetail = await prisma.itemDetails.create({
    data: {
      room_id,
      item_id,
      audit_id,
      active_quantity: active_quantity ?? 0,
      broken_quantity: broken_quantity ?? 0,
      inactive_quantity: inactive_quantity ?? 0,
    },
    include: {
      room: true,
      item: true,
    },
  });

  // Log the addition in history
  const quantities = `Active: ${itemDetail.active_quantity}, Broken: ${itemDetail.broken_quantity}, Inactive: ${itemDetail.inactive_quantity}`;

  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "ItemDetails",
      entity_id: itemDetail.id,
      entity_name: `${item.name} - ${room.name}`,
      action_type: "CREATE",
      after: itemDetail,
      description: `Added ${item.name} to ${room.name} in audit (${quantities})`,
      metadata: { audit_id, room_id, item_id },
    },
  });

  return itemDetail;
};

// ---------------- UPDATE ITEM DETAIL ----------------
// Update quantities for a specific item detail in an audit
const updateItemDetail = async (
  detail_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;
  const { active_quantity, broken_quantity, inactive_quantity } = req.body as {
    active_quantity?: number;
    broken_quantity?: number;
    inactive_quantity?: number;
  };

  // Get the item detail with audit info
  const detail = await prisma.itemDetails.findUnique({
    where: { id: detail_id },
    include: {
      audit: true,
      room: true,
      item: true,
    },
  });

  if (!detail) {
    throw new AppError(httpStatus.NOT_FOUND, "Item detail not found");
  }

  // Check if audit is still in progress
  if (detail.audit.status !== "IN_PROGRESS") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot update items in a completed or canceled audit"
    );
  }

  // Validate that values are non-negative
  if (
    (active_quantity !== undefined && active_quantity < 0) ||
    (broken_quantity !== undefined && broken_quantity < 0) ||
    (inactive_quantity !== undefined && inactive_quantity < 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantities cannot be negative"
    );
  }

  const oldValues = {
    active: detail.active_quantity,
    broken: detail.broken_quantity,
    inactive: detail.inactive_quantity,
  };

  const updatedDetail = await prisma.itemDetails.update({
    where: { id: detail_id },
    data: {
      ...(active_quantity !== undefined && { active_quantity }),
      ...(broken_quantity !== undefined && { broken_quantity }),
      ...(inactive_quantity !== undefined && { inactive_quantity }),
    },
    include: {
      room: true,
      item: true,
      audit: true,
    },
  });

  // Log the update in history
  const changes = [];
  if (active_quantity !== undefined && active_quantity !== oldValues.active) {
    changes.push(`Active: ${oldValues.active} → ${active_quantity}`);
  }
  if (broken_quantity !== undefined && broken_quantity !== oldValues.broken) {
    changes.push(`Broken: ${oldValues.broken} → ${broken_quantity}`);
  }
  if (inactive_quantity !== undefined && inactive_quantity !== oldValues.inactive) {
    changes.push(`Inactive: ${oldValues.inactive} → ${inactive_quantity}`);
  }

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "ItemDetails",
        entity_id: detail.id,
        entity_name: `${detail.item.name} - ${detail.room.name}`,
        action_type: "UPDATE",
        before: oldValues,
        after: {
          active: updatedDetail.active_quantity,
          broken: updatedDetail.broken_quantity,
          inactive: updatedDetail.inactive_quantity,
        },
        change_summary: { changes },
        description: `Updated ${detail.item.name} in ${detail.room.name}: ${changes.join(", ")}`,
        metadata: { audit_id: detail.audit_id, room_id: detail.room_id, item_id: detail.item_id },
      },
    });
  }

  return updatedDetail;
};

// ---------------- DELETE ITEM DETAIL ----------------
const deleteItemDetail = async (
  detail_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;

  const detail = await prisma.itemDetails.findUnique({
    where: { id: detail_id },
    include: {
      audit: true,
      room: true,
      item: true,
    },
  });

  if (!detail) {
    throw new AppError(httpStatus.NOT_FOUND, "Item detail not found");
  }

  // Can only delete if audit is in progress
  if (detail.audit.status !== "IN_PROGRESS") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete items from a completed or canceled audit"
    );
  }

  await prisma.itemDetails.delete({
    where: { id: detail_id },
  });

  // Log the deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "ItemDetails",
      entity_id: detail.id,
      entity_name: `${detail.item.name} - ${detail.room.name}`,
      action_type: "DELETE",
      before: {
        active_quantity: detail.active_quantity,
        broken_quantity: detail.broken_quantity,
        inactive_quantity: detail.inactive_quantity,
      },
      description: `Removed ${detail.item.name} from ${detail.room.name}`,
      metadata: { audit_id: detail.audit_id, room_id: detail.room_id, item_id: detail.item_id },
    },
  });

  return { message: "Item detail deleted successfully" };
};

// ---------------- DELETE AUDIT ----------------
const deleteAudit = async (id: string, req: Request): Promise<Audit> => {
  const user = req.user as User;

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Can only delete if status is in_progress
  if (audit.status === "COMPLETED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot delete a completed audit"
    );
  }

  const deletedAudit = await prisma.audit.delete({
    where: { id },
  });

  // Log audit deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Audit",
      entity_id: audit.id,
      entity_name: `Audit ${audit.month}/${audit.year}`,
      action_type: "DELETE",
      before: {
        month: audit.month,
        year: audit.year,
        status: audit.status,
        notes: audit.notes,
      },
      description: `Deleted audit for ${audit.month}/${audit.year}`,
    },
  });

  return deletedAudit;
};

export const auditService = {
  createAudit,
  getAllAudits,
  getAuditById,
  getLatestAudit,
  updateAudit,
  addItemDetailToAudit,
  updateItemDetail,
  deleteItemDetail,
  deleteAudit,
};
