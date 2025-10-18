// modules/item/itemDetails.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { ItemDetails, User } from "@prisma/client";

// ---------------- CREATE ITEM DETAILS ----------------
const createItemDetails = async (req: Request): Promise<ItemDetails> => {
  const {
    room_id,
    item_id,
    audit_id,
    active_quantity,
    broken_quantity,
    inactive_quantity,
  } = req.body as {
    room_id: string;
    item_id: string;
    audit_id: string;
    active_quantity?: number;
    broken_quantity?: number;
    inactive_quantity?: number;
  };

  if (!room_id || !item_id || !audit_id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room ID, Item ID, and Audit ID are required"
    );
  }

  // Check if the combination already exists
  const existingItemDetails = await prisma.itemDetails.findUnique({
    where: {
      room_id_item_id_audit_id: {
        room_id,
        item_id,
        audit_id,
      },
    },
  });

  if (existingItemDetails) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Item details for this room, item, and audit combination already exists"
    );
  }

  const user = req.user as User;

  const itemDetails = await prisma.itemDetails.create({
    data: {
      room_id,
      item_id,
      audit_id,
      active_quantity: active_quantity || 0,
      broken_quantity: broken_quantity || 0,
      inactive_quantity: inactive_quantity || 0,
    },
    include: {
      room: true,
      item: true,
      audit: {
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
        },
      },
    },
  });

  // Log creation in history
  const quantities = `Active: ${itemDetails.active_quantity}, Broken: ${itemDetails.broken_quantity}, Inactive: ${itemDetails.inactive_quantity}`;
  
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "ItemDetails",
      entity_id: itemDetails.id,
      entity_name: `${itemDetails.item.name} - ${itemDetails.room.name}`,
      action_type: "CREATE",
      after: itemDetails,
      description: `Created item details: ${itemDetails.item.name} in ${itemDetails.room.name} (${quantities})`,
      metadata: { audit_id, room_id, item_id },
    },
  });

  return itemDetails;
};

// ---------------- GET ALL ITEM DETAILS ----------------
const getAllItemDetails = async (): Promise<ItemDetails[]> => {
  const itemDetails = await prisma.itemDetails.findMany({
    include: {
      room: true,
      item: true,
      audit: {
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return itemDetails;
};

// ---------------- GET ITEM DETAILS BY ID ----------------
const getItemDetailsById = async (id: string): Promise<ItemDetails> => {
  const itemDetails = await prisma.itemDetails.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
      audit: {
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
        },
      },
    },
  });

  if (!itemDetails) {
    throw new AppError(httpStatus.NOT_FOUND, "Item details not found");
  }

  return itemDetails;
};

// ---------------- GET ITEM DETAILS BY ROOM AND ITEM ----------------
const getItemDetailsByRoomAndItem = async (
  room_id: string,
  item_id: string
): Promise<ItemDetails[]> => {
  const itemDetails = await prisma.itemDetails.findMany({
    where: {
      room_id,
      item_id,
    },
    include: {
      room: true,
      item: true,
      audit: {
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return itemDetails;
};

// ---------------- UPDATE ITEM DETAILS ----------------
const updateItemDetails = async (
  id: string,
  req: Request
): Promise<ItemDetails> => {
  const { active_quantity, broken_quantity, inactive_quantity } = req.body as {
    active_quantity?: number;
    broken_quantity?: number;
    inactive_quantity?: number;
  };

  const user = req.user as User;
  const itemDetails = await prisma.itemDetails.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
    },
  });
  if (!itemDetails) {
    throw new AppError(httpStatus.NOT_FOUND, "Item details not found");
  }

  const before = {
    active_quantity: itemDetails.active_quantity,
    broken_quantity: itemDetails.broken_quantity,
    inactive_quantity: itemDetails.inactive_quantity,
  };

  const updatedItemDetails = await prisma.itemDetails.update({
    where: { id },
    data: {
      ...(active_quantity !== undefined && { active_quantity }),
      ...(broken_quantity !== undefined && { broken_quantity }),
      ...(inactive_quantity !== undefined && { inactive_quantity }),
    },
    include: {
      room: true,
      item: true,
      audit: {
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
        },
      },
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (active_quantity !== undefined && active_quantity !== itemDetails.active_quantity) {
    changes.push(`Active: ${itemDetails.active_quantity} → ${active_quantity}`);
  }
  if (broken_quantity !== undefined && broken_quantity !== itemDetails.broken_quantity) {
    changes.push(`Broken: ${itemDetails.broken_quantity} → ${broken_quantity}`);
  }
  if (inactive_quantity !== undefined && inactive_quantity !== itemDetails.inactive_quantity) {
    changes.push(`Inactive: ${itemDetails.inactive_quantity} → ${inactive_quantity}`);
  }

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "ItemDetails",
        entity_id: itemDetails.id,
        entity_name: `${itemDetails.item.name} - ${itemDetails.room.name}`,
        action_type: "UPDATE",
        before,
        after: {
          active_quantity: updatedItemDetails.active_quantity,
          broken_quantity: updatedItemDetails.broken_quantity,
          inactive_quantity: updatedItemDetails.inactive_quantity,
        },
        change_summary: { changes },
        description: `Updated item details: ${changes.join(", ")}`,
        metadata: { audit_id: itemDetails.audit_id, room_id: itemDetails.room_id, item_id: itemDetails.item_id },
      },
    });
  }

  return updatedItemDetails;
};

// ---------------- DELETE ITEM DETAILS ----------------
const deleteItemDetails = async (id: string, req: Request): Promise<ItemDetails> => {
  const user = req.user as User;
  const itemDetails = await prisma.itemDetails.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
    },
  });
  if (!itemDetails) {
    throw new AppError(httpStatus.NOT_FOUND, "Item details not found");
  }

  const deletedItemDetails = await prisma.itemDetails.delete({
    where: { id },
  });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "ItemDetails",
      entity_id: itemDetails.id,
      entity_name: `${itemDetails.item.name} - ${itemDetails.room.name}`,
      action_type: "DELETE",
      before: {
        active_quantity: itemDetails.active_quantity,
        broken_quantity: itemDetails.broken_quantity,
        inactive_quantity: itemDetails.inactive_quantity,
      },
      description: `Deleted item details: ${itemDetails.item.name} in ${itemDetails.room.name}`,
      metadata: { audit_id: itemDetails.audit_id, room_id: itemDetails.room_id, item_id: itemDetails.item_id },
    },
  });

  return deletedItemDetails;
};

export const itemDetailsService = {
  createItemDetails,
  getAllItemDetails,
  getItemDetailsById,
  getItemDetailsByRoomAndItem,
  updateItemDetails,
  deleteItemDetails,
};
