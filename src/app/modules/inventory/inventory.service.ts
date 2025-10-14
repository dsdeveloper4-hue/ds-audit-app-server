// modules/inventory/inventory.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Inventory } from "@prisma/client";

// ---------------- CREATE INVENTORY ----------------
const createInventory = async (req: Request): Promise<Inventory> => {
  const { room_id, item_id } = req.body as {
    room_id: string;
    item_id: string;
  };

  if (!room_id || !item_id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room ID and Item ID are required"
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

  // Check if inventory already exists
  const existingInventory = await prisma.inventory.findUnique({
    where: {
      room_id_item_id: {
        room_id,
        item_id,
      },
    },
  });

  if (existingInventory) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Inventory for this room-item combination already exists"
    );
  }

  const inventory = await prisma.inventory.create({
    data: {
      room_id,
      item_id,
    },
    include: {
      room: true,
      item: true,
    },
  });

  return inventory;
};

// ---------------- CREATE BULK INVENTORY ----------------
// This will create inventory for all items in a specific room
const createBulkInventory = async (req: Request): Promise<Inventory[]> => {
  const { room_id } = req.body as { room_id: string };

  if (!room_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Room ID is required");
  }

  // Check if room exists
  const room = await prisma.room.findUnique({ where: { id: room_id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Get all items
  const items = await prisma.item.findMany();

  if (items.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "No items found in the system");
  }

  // Get existing inventories for this room
  const existingInventories = await prisma.inventory.findMany({
    where: { room_id },
    select: { item_id: true },
  });

  const existingItemIds = new Set(
    existingInventories.map((inv) => inv.item_id)
  );

  // Filter out items that already have inventory
  const newItems = items.filter((item) => !existingItemIds.has(item.id));

  if (newItems.length === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "All items already have inventory for this room"
    );
  }

  // Create inventories for new items
  const inventories = await prisma.$transaction(
    newItems.map((item) =>
      prisma.inventory.create({
        data: {
          room_id,
          item_id: item.id,
        },
        include: {
          room: true,
          item: true,
        },
      })
    )
  );

  return inventories;
};

// ---------------- GET ALL INVENTORIES ----------------
const getAllInventories = async (): Promise<Inventory[]> => {
  const inventories = await prisma.inventory.findMany({
    include: {
      room: true,
      item: true,
    },
    orderBy: [{ room: { name: "asc" } }, { item: { name: "asc" } }],
  });

  return inventories;
};

// ---------------- GET INVENTORY BY ID ----------------
const getInventoryById = async (id: string): Promise<Inventory> => {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
      audit_records: {
        include: {
          audit: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
  });

  if (!inventory) {
    throw new AppError(httpStatus.NOT_FOUND, "Inventory not found");
  }

  return inventory;
};

// ---------------- GET INVENTORIES BY ROOM ----------------
const getInventoriesByRoom = async (room_id: string): Promise<Inventory[]> => {
  const room = await prisma.room.findUnique({ where: { id: room_id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  const inventories = await prisma.inventory.findMany({
    where: { room_id },
    include: {
      item: true,
    },
    orderBy: {
      item: { name: "asc" },
    },
  });

  return inventories;
};

// ---------------- UPDATE INVENTORY ----------------
const updateInventory = async (id: string, req: Request): Promise<Inventory> => {
  const {
    current_quantity,
    active_quantity,
    broken_quantity,
    inactive_quantity,
  } = req.body as {
    current_quantity?: number;
    active_quantity?: number;
    broken_quantity?: number;
    inactive_quantity?: number;
  };

  const inventory = await prisma.inventory.findUnique({ where: { id } });
  if (!inventory) {
    throw new AppError(httpStatus.NOT_FOUND, "Inventory not found");
  }

  const updatedInventory = await prisma.inventory.update({
    where: { id },
    data: {
      ...(current_quantity !== undefined && { current_quantity }),
      ...(active_quantity !== undefined && { active_quantity }),
      ...(broken_quantity !== undefined && { broken_quantity }),
      ...(inactive_quantity !== undefined && { inactive_quantity }),
    },
    include: {
      room: true,
      item: true,
    },
  });

  return updatedInventory;
};

// ---------------- DELETE INVENTORY ----------------
const deleteInventory = async (id: string): Promise<Inventory> => {
  const inventory = await prisma.inventory.findUnique({ where: { id } });
  if (!inventory) {
    throw new AppError(httpStatus.NOT_FOUND, "Inventory not found");
  }

  const deletedInventory = await prisma.inventory.delete({
    where: { id },
  });

  return deletedInventory;
};

export const inventoryService = {
  createInventory,
  createBulkInventory,
  getAllInventories,
  getInventoryById,
  getInventoriesByRoom,
  updateInventory,
  deleteInventory,
};
