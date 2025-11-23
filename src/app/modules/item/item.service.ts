// modules/item/item.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Item, User } from "@prisma/client";

// ---------------- CREATE ITEM ----------------
const createItem = async (req: Request): Promise<Item> => {
  const { name, category, sub_category, unit, unit_price } = req.body as {
    name: string;
    category?: string;
    sub_category?: string;
    unit?: string;
    unit_price?: number;
  };

  if (!name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
  }

  if (unit_price !== undefined && unit_price < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unit price cannot be negative");
  }

  const user = req.user as User;

  const item = await prisma.item.create({
    data: {
      name,
      category,
      sub_category,
      unit,
      unit_price: unit_price !== undefined ? unit_price : null,
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
      description: `Created item: ${item.name} (Category: ${
        item.category || "N/A"
      }, Sub-Category: ${item.sub_category || "N/A"}, Unit: ${
        item.unit || "N/A"
      }, Price: ${unit_price ? `$${unit_price}` : "N/A"})`,
    },
  });

  return item;
};

// ---------------- GET ALL ITEMS ----------------
const getAllItems = async (query: any): Promise<any> => {
  // Parse pagination params
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch items with pagination
  const [items, total] = await Promise.all([
    prisma.item.findMany({
      skip,
      take: limit,
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: { itemDetails: true },
        },
      },
    }),
    prisma.item.count(),
  ]);

  // Return paginated response
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
  const { name, category, sub_category, unit, unit_price } = req.body as {
    name?: string;
    category?: string;
    sub_category?: string;
    unit?: string;
    unit_price?: number;
  };

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  if (unit_price !== undefined && unit_price < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unit price cannot be negative");
  }

  const user = req.user as User;
  const before = { ...item };
  const priceChanged =
    unit_price !== undefined && unit_price !== Number(item.unit_price);

  const updatedItem = await prisma.item.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category !== undefined && { category }),
      ...(sub_category !== undefined && { sub_category }),
      ...(unit !== undefined && { unit }),
      ...(unit_price !== undefined && { unit_price }),
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (name && name !== item.name) changes.push(`name: ${item.name} → ${name}`);
  if (category !== undefined && category !== item.category)
    changes.push(`category: ${item.category} → ${category}`);
  if (sub_category !== undefined && sub_category !== item.sub_category)
    changes.push(`sub-category: ${item.sub_category} → ${sub_category}`);
  if (unit !== undefined && unit !== item.unit)
    changes.push(`unit: ${item.unit} → ${unit}`);
  if (unit_price !== undefined && unit_price !== Number(item.unit_price))
    changes.push(`unit price: ${item.unit_price} → ${unit_price}`);

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

  // If price changed, update ItemDetails in the latest audit
  if (priceChanged) {
    console.log(
      `💰 Price changed for ${item.name}: ${item.unit_price} → ${unit_price}`
    );
    console.log(`🔄 Updating ItemDetails in latest audit...`);

    try {
      // Get the latest audit
      const latestAudit = await prisma.audit.findFirst({
        orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
      });

      if (latestAudit) {
        // Update all ItemDetails for this item in the latest audit
        const itemDetails = await prisma.itemDetails.findMany({
          where: {
            audit_id: latestAudit.id,
            item_id: id,
          },
        });

        for (const detail of itemDetails) {
          const totalQty =
            detail.active_quantity +
            detail.broken_quantity +
            detail.inactive_quantity +
            (detail.lost_quantity || 0);

          const newTotalPrice = unit_price! * totalQty;

          await prisma.itemDetails.update({
            where: { id: detail.id },
            data: {
              unit_price: unit_price,
              total_price: newTotalPrice,
            },
          });

          console.log(
            `✅ Updated ItemDetails for ${item.name} in audit ${latestAudit.month}/${latestAudit.year}`
          );
        }

        // Log the price propagation
        await prisma.recentActivityHistory.create({
          data: {
            user_id: user.id,
            entity_type: "ItemDetails",
            entity_name: `${item.name} - Price Update`,
            action_type: "UPDATE",
            description: `Auto-updated ${itemDetails.length} audit entries with new price: ${unit_price}`,
            metadata: {
              item_id: id,
              item_name: item.name,
              old_price: Number(item.unit_price),
              new_price: unit_price,
              audit_id: latestAudit.id,
              entries_updated: itemDetails.length,
              source: "item_price_update",
            },
          },
        });
      }
    } catch (error) {
      console.error("❌ Error updating ItemDetails after price change:", error);
      // Don't throw - item update was successful, just log the error
    }
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
