// modules/item/item.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Item } from "@prisma/client";

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

  const item = await prisma.item.create({
    data: {
      name,
      category,
      unit,
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

  const updatedItem = await prisma.item.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category && { category }),
      ...(unit && { unit }),
    },
  });

  return updatedItem;
};

// ---------------- DELETE ITEM ----------------
const deleteItem = async (id: string): Promise<Item> => {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  const deletedItem = await prisma.item.delete({
    where: { id },
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
