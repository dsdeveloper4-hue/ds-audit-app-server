// modules/item/item.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Item, User } from "@prisma/client";

// ---------------- CREATE ITEM ----------------
const createItem = async (req: Request): Promise<Item> => {
  const { name, category, unit } = req.body as {
    name: string;
    category?: string;
    unit?: string;
  };

  if (!name ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name is required"
    );
  }

  const user = req.user as User;

  const item = await prisma.item.create({
    data: {
      name,
      category,
      unit,
    },
  });

  // Log creation in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Item",
      entity_id: item.id,
      entity_name: item.name,
      action_type: "CREATE",
      after: item,
      description: `Created item: ${item.name}`,
    },
  });

  return item;
};

// ---------------- GET ALL ITEMS ----------------
const getAllItems = async (): Promise<Item[]> => {
  const items = await prisma.item.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: { itemDetails: true },
      },
    },
  });

  return items;
};

// ---------------- GET ITEM BY ID ----------------
const getItemById = async (id: string): Promise<Item> => {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      itemDetails: {
        include: {
          room: true,
          audit: {
            select: {
              id: true,
              month: true,
              year: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  return item;
};

// ---------------- UPDATE ITEM ----------------
const updateItem = async (id: string, req: Request): Promise<Item> => {
  const { name, category, unit } = req.body as {
    name?: string;
    category?: string;
    unit?: string;
  };

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  const user = req.user as User;
  const before = { ...item };

  const updatedItem = await prisma.item.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category && { category }),
      ...(unit && { unit }),
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (name && name !== item.name) changes.push(`name: ${item.name} → ${name}`);
  if (category && category !== item.category) changes.push(`category: ${item.category} → ${category}`);
  if (unit && unit !== item.unit) changes.push(`unit: ${item.unit} → ${unit}`);

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "Item",
        entity_id: item.id,
        entity_name: item.name,
        action_type: "UPDATE",
        before,
        after: updatedItem,
        change_summary: { changes },
        description: `Updated item: ${changes.join(", ")}`,
      },
    });
  }

  return updatedItem;
};

// ---------------- DELETE ITEM ----------------
const deleteItem = async (id: string, req: Request): Promise<Item> => {
  const user = req.user as User;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  const deletedItem = await prisma.item.delete({
    where: { id },
  });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "Item",
      entity_id: item.id,
      entity_name: item.name,
      action_type: "DELETE",
      before: item,
      description: `Deleted item: ${item.name}`,
    },
  });

  return deletedItem;
};

export const itemService = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
