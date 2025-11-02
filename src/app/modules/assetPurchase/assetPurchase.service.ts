// modules/assetPurchase/assetPurchase.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { User } from "@prisma/client";

// ---------------- CREATE ASSET PURCHASE ----------------
const createAssetPurchase = async (req: Request): Promise<any> => {
  const user = req.user as User;
  const { room_id, item_id, quantity, unit_price, purchase_date, notes } =
    req.body as {
      room_id: string;
      item_id: string;
      quantity: number;
      unit_price: number;
      purchase_date?: string;
      notes?: string;
    };

  if (!room_id || !item_id || !quantity || !unit_price) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room, item, quantity, and unit price are required"
    );
  }

  if (quantity <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be greater than 0"
    );
  }

  if (unit_price < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unit price cannot be negative");
  }

  // Verify room exists
  const room = await prisma.room.findUnique({ where: { id: room_id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Verify item exists
  const item = await prisma.item.findUnique({ where: { id: item_id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  // Calculate total cost
  const total_cost = quantity * unit_price;

  // Update item's unit_price if not set or if this is a more recent price
  if (!item.unit_price || Number(item.unit_price) !== unit_price) {
    await prisma.item.update({
      where: { id: item_id },
      data: { unit_price },
    });
    console.log(`✅ Updated item price for ${item.name}: $${unit_price}`);
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Create asset purchase
    const assetPurchase = await tx.assetPurchase.create({
      data: {
        room_id,
        item_id,
        quantity,
        unit_price,
        total_cost,
        purchase_date: purchase_date ? new Date(purchase_date) : new Date(),
        notes,
        added_by: user.id,
      },
      include: {
        room: true,
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
    });

    // Find the latest audit (most recent by year and month)
    const latestAudit = await tx.audit.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
    });

    if (latestAudit) {
      // Check if ItemDetails already exists for this room-item-audit combination
      const existingItemDetail = await tx.itemDetails.findUnique({
        where: {
          room_id_item_id_audit_id: {
            room_id,
            item_id,
            audit_id: latestAudit.id,
          },
        },
      });

      if (existingItemDetail) {
        // Update existing ItemDetails - add to active quantity and update prices
        const newActiveQty = existingItemDetail.active_quantity + quantity;
        const existingTotalPrice = Number(existingItemDetail.total_price) || 0;
        const newTotalPrice = existingTotalPrice + total_cost;
        const totalQty =
          newActiveQty +
          existingItemDetail.broken_quantity +
          existingItemDetail.inactive_quantity;
        const newUnitPrice =
          totalQty > 0 ? newTotalPrice / totalQty : unit_price;

        await tx.itemDetails.update({
          where: { id: existingItemDetail.id },
          data: {
            active_quantity: newActiveQty,
            unit_price: newUnitPrice,
            total_price: newTotalPrice,
          },
        });

        console.log(
          `✅ Updated ItemDetails: Added ${quantity} to active quantity for ${item.name} in ${room.name}. Total price: ${newTotalPrice}`
        );
      } else {
        // Create new ItemDetails with active quantity and prices
        await tx.itemDetails.create({
          data: {
            room_id,
            item_id,
            audit_id: latestAudit.id,
            active_quantity: quantity,
            broken_quantity: 0,
            inactive_quantity: 0,
            unit_price: unit_price,
            total_price: total_cost,
          },
        });

        console.log(
          `✅ Created ItemDetails: ${quantity} ${item.name}(s) as active in ${room.name} for audit ${latestAudit.month}/${latestAudit.year}. Total price: ${total_cost}`
        );
      }

      // Log the audit update in history
      await tx.recentActivityHistory.create({
        data: {
          user_id: user.id,
          entity_type: "ItemDetails",
          entity_name: `${item.name} - ${room.name}`,
          action_type: "UPDATE",
          description: `Added ${quantity} ${item.name}(s) to audit ${latestAudit.month}/${latestAudit.year} as active items (from asset purchase)`,
          metadata: {
            audit_id: latestAudit.id,
            room_id,
            item_id,
            quantity,
            unit_price,
            total_cost,
            source: "asset_purchase",
          },
        },
      });
    } else {
      console.log(
        "⚠️ No audit found. Asset purchase created but not added to any audit."
      );
    }

    // Log asset purchase in history
    await tx.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "AssetPurchase",
        entity_id: assetPurchase.id,
        entity_name: `${item.name} - ${room.name}`,
        action_type: "CREATE",
        after: assetPurchase,
        description: `Added ${quantity} ${item.name}(s) to ${
          room.name
        } (Total: $${total_cost})${
          latestAudit
            ? ` - Added to audit ${latestAudit.month}/${latestAudit.year}`
            : ""
        }`,
      },
    });

    return assetPurchase;
  });

  return result;
};

// ---------------- GET ALL ASSET PURCHASES ----------------
const getAllAssetPurchases = async (req: Request): Promise<any> => {
  const { room_id, item_id, start_date, end_date } = req.query;

  const where: any = {};

  if (room_id) where.room_id = room_id as string;
  if (item_id) where.item_id = item_id as string;
  if (start_date || end_date) {
    where.purchase_date = {};
    if (start_date) where.purchase_date.gte = new Date(start_date as string);
    if (end_date) where.purchase_date.lte = new Date(end_date as string);
  }

  const purchases = await prisma.assetPurchase.findMany({
    where,
    include: {
      room: true,
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
    orderBy: {
      purchase_date: "desc",
    },
  });

  return purchases;
};

// ---------------- GET ASSET PURCHASE BY ID ----------------
const getAssetPurchaseById = async (id: string): Promise<any> => {
  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  return purchase;
};

// ---------------- UPDATE ASSET PURCHASE ----------------
const updateAssetPurchase = async (id: string, req: Request): Promise<any> => {
  const user = req.user as User;
  const { room_id, item_id, quantity, unit_price, purchase_date, notes } =
    req.body as {
      room_id?: string;
      item_id?: string;
      quantity?: number;
      unit_price?: number;
      purchase_date?: string;
      notes?: string;
    };

  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: { room: true, item: true },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  // Verify room if provided
  if (room_id) {
    const room = await prisma.room.findUnique({ where: { id: room_id } });
    if (!room) {
      throw new AppError(httpStatus.NOT_FOUND, "Room not found");
    }
  }

  // Verify item if provided
  if (item_id) {
    const item = await prisma.item.findUnique({ where: { id: item_id } });
    if (!item) {
      throw new AppError(httpStatus.NOT_FOUND, "Item not found");
    }
  }

  // Validate quantity and unit_price
  if (quantity !== undefined && quantity <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be greater than 0"
    );
  }

  if (unit_price !== undefined && unit_price < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unit price cannot be negative");
  }

  // Calculate new total cost
  const newQuantity = quantity ?? purchase.quantity;
  const newUnitPrice = unit_price ?? Number(purchase.unit_price);
  const total_cost = newQuantity * newUnitPrice;

  const before = { ...purchase };

  const updatedPurchase = await prisma.assetPurchase.update({
    where: { id },
    data: {
      ...(room_id && { room_id }),
      ...(item_id && { item_id }),
      ...(quantity !== undefined && { quantity }),
      ...(unit_price !== undefined && { unit_price }),
      total_cost,
      ...(purchase_date && { purchase_date: new Date(purchase_date) }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      room: true,
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
  });

  // Log update in history
  const changes: string[] = [];
  if (room_id && room_id !== purchase.room_id) changes.push(`room changed`);
  if (item_id && item_id !== purchase.item_id) changes.push(`item changed`);
  if (quantity && quantity !== purchase.quantity)
    changes.push(`quantity: ${purchase.quantity} → ${quantity}`);
  if (unit_price && unit_price !== Number(purchase.unit_price))
    changes.push(`unit price: ${purchase.unit_price} → ${unit_price}`);

  if (changes.length > 0) {
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "AssetPurchase",
        entity_id: purchase.id,
        entity_name: `${updatedPurchase.item.name} - ${updatedPurchase.room.name}`,
        action_type: "UPDATE",
        before,
        after: updatedPurchase,
        change_summary: { changes },
        description: `Updated asset purchase: ${changes.join(", ")}`,
      },
    });
  }

  return updatedPurchase;
};

// ---------------- DELETE ASSET PURCHASE ----------------
const deleteAssetPurchase = async (id: string, req: Request): Promise<any> => {
  const user = req.user as User;

  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: { room: true, item: true },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  await prisma.assetPurchase.delete({ where: { id } });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "AssetPurchase",
      entity_id: purchase.id,
      entity_name: `${purchase.item.name} - ${purchase.room.name}`,
      action_type: "DELETE",
      before: purchase,
      description: `Deleted asset purchase: ${purchase.quantity} ${purchase.item.name}(s) from ${purchase.room.name}`,
    },
  });

  return { message: "Asset purchase deleted successfully" };
};

// ---------------- GET PURCHASE SUMMARY ----------------
const getPurchaseSummary = async (req: Request): Promise<any> => {
  const { start_date, end_date, room_id } = req.query;

  const where: any = {};

  if (room_id) where.room_id = room_id as string;
  if (start_date || end_date) {
    where.purchase_date = {};
    if (start_date) where.purchase_date.gte = new Date(start_date as string);
    if (end_date) where.purchase_date.lte = new Date(end_date as string);
  }

  const purchases = await prisma.assetPurchase.findMany({
    where,
    include: {
      room: true,
      item: true,
    },
  });

  // Group by room and item
  const summary: any = {
    total_purchases: purchases.length,
    total_cost: purchases.reduce((sum, p) => sum + Number(p.total_cost), 0),
    by_room: {} as any,
    by_item: {} as any,
  };

  purchases.forEach((purchase) => {
    const roomName = purchase.room.name;
    const itemName = purchase.item.name;

    // By room
    if (!summary.by_room[roomName]) {
      summary.by_room[roomName] = {
        room_id: purchase.room_id,
        room_name: roomName,
        total_items: 0,
        total_cost: 0,
        items: [],
      };
    }
    summary.by_room[roomName].total_items += purchase.quantity;
    summary.by_room[roomName].total_cost += Number(purchase.total_cost);
    summary.by_room[roomName].items.push({
      item_name: itemName,
      quantity: purchase.quantity,
      unit_price: Number(purchase.unit_price),
      total_cost: Number(purchase.total_cost),
    });

    // By item
    if (!summary.by_item[itemName]) {
      summary.by_item[itemName] = {
        item_id: purchase.item_id,
        item_name: itemName,
        total_quantity: 0,
        total_cost: 0,
        rooms: [],
      };
    }
    summary.by_item[itemName].total_quantity += purchase.quantity;
    summary.by_item[itemName].total_cost += Number(purchase.total_cost);
    summary.by_item[itemName].rooms.push({
      room_name: roomName,
      quantity: purchase.quantity,
      unit_price: Number(purchase.unit_price),
      total_cost: Number(purchase.total_cost),
    });
  });

  summary.by_room = Object.values(summary.by_room);
  summary.by_item = Object.values(summary.by_item);

  return summary;
};

export const assetPurchaseService = {
  createAssetPurchase,
  getAllAssetPurchases,
  getAssetPurchaseById,
  updateAssetPurchase,
  deleteAssetPurchase,
  getPurchaseSummary,
};
