// modules/audit/audit.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { Audit, User } from "@prisma/client";
import {
  calculateTotalAssetValue,
  calculateAdjustedAssetValue,
} from "@app/shared/calculateTotalValue";

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
      throw new AppError(
        httpStatus.NOT_FOUND,
        "One or more participants not found"
      );
    }
  }

  const latestAudit = await prisma.audit.findFirst({
    include: {
      participants: {
        select: {
          id: true,
        },
      },
      itemDetails: {
        select: {
          room_id: true,
          item_id: true,
          active_quantity: true,
          broken_quantity: true,
          inactive_quantity: true,
          unit_price: true,
          total_price: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
  });

  const hasProvidedParticipants = participant_ids && participant_ids.length > 0;
  const participantConnect = hasProvidedParticipants
    ? participant_ids.map((id) => ({ id }))
    : latestAudit?.participants?.map((participant) => ({
        id: participant.id,
      })) ?? [];

  const resolvedNotes =
    notes !== undefined ? notes : latestAudit?.notes ?? undefined;

  const audit = await prisma.$transaction(async (tx) => {
    const createdAudit = await tx.audit.create({
      data: {
        month,
        year,
        status: "IN_PROGRESS",
        notes: resolvedNotes,
        participants:
          participantConnect.length > 0
            ? {
                connect: participantConnect,
              }
            : undefined,
      },
    });

    // Copy item details from previous audit - SERIAL NUMBER BASED
    if (latestAudit?.itemDetails && latestAudit.itemDetails.length > 0) {
      console.log(
        "📋 [createAudit] Copying item details from previous audit (serial number-based)..."
      );

      // Get all current asset purchases to map serial numbers to their latest prices
      const assetPurchases = await tx.assetPurchase.findMany({
        where: {
          serial_number: { not: null }, // Only serial-tracked purchases
        },
        include: {
          room: true,
          item: true,
        },
        orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
      });

      // Map serial numbers to their latest purchase data
      const serialMap = new Map<string, any>();
      assetPurchases.forEach((purchase) => {
        if (purchase.serial_number && !serialMap.has(purchase.serial_number)) {
          serialMap.set(purchase.serial_number, {
            room_id: purchase.room_id,
            item_id: purchase.item_id,
            unit_price: Number(purchase.unit_price),
            serial_number: purchase.serial_number,
            asset_purchase_id: purchase.id,
          });
        }
      });

      // Copy each ItemDetails record from previous audit
      // If it has a serial number, use the latest price for that serial
      // If it's aggregated (no serial), copy as-is
      const itemDetailsToCreate = latestAudit.itemDetails.map((detail: any) => {
        let unitPrice = detail.unit_price ? Number(detail.unit_price) : 0;
        let totalPrice = detail.total_price ? Number(detail.total_price) : 0;
        let assetPurchaseId = detail.asset_purchase_id;

        // If this detail has a serial number, get its latest price
        if (detail.item_serial_no) {
          const serialData = serialMap.get(detail.item_serial_no);
          if (serialData) {
            unitPrice = serialData.unit_price;
            totalPrice = unitPrice; // For serial items, total = unit price
            assetPurchaseId = serialData.asset_purchase_id;
            console.log(
              `  ✓ Serial ${detail.item_serial_no}: using latest price ₹${unitPrice}`
            );
          } else {
            console.log(
              `  ⚠️ Serial ${detail.item_serial_no}: no purchase found, keeping previous price ₹${unitPrice}`
            );
          }
        }

        return {
          audit_id: createdAudit.id,
          room_id: detail.room_id,
          item_id: detail.item_id,
          item_serial_no: detail.item_serial_no,
          asset_purchase_id: assetPurchaseId,
          active_quantity: detail.active_quantity,
          broken_quantity: detail.broken_quantity,
          inactive_quantity: detail.inactive_quantity,
          lost_quantity: detail.lost_quantity || 0,
          unit_price: unitPrice,
          total_price: totalPrice,
        };
      });

      await tx.itemDetails.createMany({
        data: itemDetailsToCreate,
      });

      console.log(
        `✅ [createAudit] Successfully created ${itemDetailsToCreate.length} items (serial number-based)`
      );
    } else {
      // No previous audit - create item details for all room-item combinations with 0 values
      const rooms = await tx.room.findMany({ select: { id: true } });
      const items = await tx.item.findMany({ select: { id: true } });

      if (rooms.length > 0 && items.length > 0) {
        const itemDetailsData = [];
        for (const room of rooms) {
          for (const item of items) {
            itemDetailsData.push({
              audit_id: createdAudit.id,
              room_id: room.id,
              item_id: item.id,
              active_quantity: 0,
              broken_quantity: 0,
              inactive_quantity: 0,
            });
          }
        }

        if (itemDetailsData.length > 0) {
          await tx.itemDetails.createMany({
            data: itemDetailsData,
          });
        }
      }
    }

    const finalAudit = await tx.audit.findUnique({
      where: { id: createdAudit.id },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        itemDetails: {
          include: {
            room: true,
            item: true,
          },
        },
        _count: {
          select: { itemDetails: true },
        },
      },
    });

    if (!finalAudit) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create audit"
      );
    }

    return finalAudit;
  });

  // Log audit creation in history
  const participantCount = audit.participants?.length || 0;
  const participantInfo =
    participantCount > 0
      ? ` with ${participantCount} participant${
          participantCount > 1 ? "s" : ""
        }`
      : "";

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

  // Group item details by room for better organization (same as getAuditById)
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
    detailsByRoom: Object.values(detailsByRoom),
  };
};

// ---------------- GET ALL AUDITS ----------------
const getAllAudits = async (): Promise<Audit[]> => {
  const audits = await prisma.audit.findMany({
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      itemDetails: {
        include: {
          room: true,
          item: true,
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
          email: true,
        },
      },
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
        orderBy: [{ room: { name: "asc" } }, { item: { name: "asc" } }],
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Filter out items with zero total quantity (active + broken + inactive + lost = 0)
  const activeItemDetails = audit.itemDetails.filter((detail: any) => {
    const totalQty =
      detail.active_quantity +
      detail.broken_quantity +
      detail.inactive_quantity +
      (detail.lost_quantity || 0);
    return totalQty > 0;
  });

  // Fetch history for this audit from RecentActivityHistory
  const history = await prisma.recentActivityHistory.findMany({
    where: {
      OR: [
        { entity_type: "Audit", entity_id: id },
        {
          entity_type: "ItemDetails",
          metadata: { path: ["audit_id"], equals: id },
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      occurred_at: "desc",
    },
  });

  // Group item details by room for better organization (only active items)
  const detailsByRoom = activeItemDetails.reduce((acc: any, detail: any) => {
    const roomName = detail.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        room: detail.room,
        items: [],
        totalItems: 0,
        totalValue: 0,
      };
    }
    acc[roomName].items.push(detail);

    // Calculate total items (count of items with quantity > 0)
    acc[roomName].totalItems += 1;

    // Calculate total value
    const totalPrice = Number(detail.total_price) || 0;
    acc[roomName].totalValue += totalPrice;

    return acc;
  }, {});

  return {
    ...audit,
    itemDetails: activeItemDetails, // Return only active items
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
          email: true,
        },
      },
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
        orderBy: [{ room: { name: "asc" } }, { item: { name: "asc" } }],
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
  });

  // If no audit exists, return a default object instead of null
  if (!audit) {
    return { message: "No audits found" };
  }

  // Filter out items with zero total quantity
  const activeItemDetails = audit.itemDetails.filter((detail: any) => {
    const totalQty =
      detail.active_quantity +
      detail.broken_quantity +
      detail.inactive_quantity +
      (detail.lost_quantity || 0);
    return totalQty > 0;
  });

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
          email: true,
        },
      },
    },
    orderBy: {
      occurred_at: "desc",
    },
  });

  const detailsByRoom = activeItemDetails.reduce((acc: any, detail: any) => {
    const roomName = detail.room.name;
    if (!acc[roomName]) {
      acc[roomName] = {
        room: detail.room,
        items: [],
        totalItems: 0,
        totalValue: 0,
      };
    }
    acc[roomName].items.push(detail);

    // Calculate total items (count of items with quantity > 0)
    acc[roomName].totalItems += 1;

    // Calculate total value
    const totalPrice = Number(detail.total_price) || 0;
    acc[roomName].totalValue += totalPrice;

    return acc;
  }, {} as Record<string, any>);

  return {
    ...audit,
    itemDetails: activeItemDetails, // Return only active items
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
          email: true,
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
  const {
    room_id,
    item_id,
    active_quantity,
    broken_quantity,
    inactive_quantity,
  } = req.body as {
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

  // Check if an aggregated record already exists for this combination
  const existing = await prisma.itemDetails.findFirst({
    where: {
      room_id,
      item_id,
      audit_id,
      item_serial_no: null, // Only check for aggregated records
    },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This room-item combination already exists in the audit"
    );
  }

  // SERIAL NUMBER-BASED PRICING:
  // Get ALL asset purchases for this item in this room to calculate accurate total price
  const assetPurchases = await prisma.assetPurchase.findMany({
    where: {
      item_id,
      room_id,
    },
    orderBy: [{ purchase_date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      unit_price: true,
      quantity: true,
      total_cost: true,
      serial_number: true,
      purchase_date: true,
    },
  });

  console.log("🔍 [addItemDetailToAudit] Item:", item.name);
  console.log("🔍 [addItemDetailToAudit] Room:", room.name);
  console.log(
    `🔍 [addItemDetailToAudit] Found ${assetPurchases.length} asset purchases`
  );

  // Calculate total price by summing all purchase costs (preserves individual prices)
  let totalPrice = 0;
  let totalPurchasedQty = 0;

  assetPurchases.forEach((purchase) => {
    const cost = Number(purchase.total_cost) || 0;
    totalPrice += cost;
    totalPurchasedQty += purchase.quantity;
    console.log(
      `  - Purchase: qty=${purchase.quantity}, unit_price=${
        purchase.unit_price
      }, total_cost=${cost}, serial=${purchase.serial_number || "N/A"}`
    );
  });

  console.log(
    `📊 Total from purchases: ${totalPurchasedQty} items = ₹${totalPrice}`
  );

  // Calculate average unit price for reference (but use total_price for accuracy)
  const unitPrice = totalPurchasedQty > 0 ? totalPrice / totalPurchasedQty : 0;

  // If no purchases found, fallback to item master price
  if (assetPurchases.length === 0) {
    console.log("⚠️ No asset purchases found for this item in this room");
    if (item.unit_price) {
      const fallbackPrice = Number(item.unit_price);
      console.log(`⚠️ Using item master price: ₹${fallbackPrice}`);
      const totalQuantity =
        (active_quantity ?? 0) +
        (broken_quantity ?? 0) +
        (inactive_quantity ?? 0);
      totalPrice = fallbackPrice * totalQuantity;
    } else {
      console.log(
        "❌ WARNING: No price found! Please add asset purchases or set unit_price in item master"
      );
    }
  }

  const totalQuantity =
    (active_quantity ?? 0) + (broken_quantity ?? 0) + (inactive_quantity ?? 0);

  console.log("🔍 [addItemDetailToAudit] Final unit_price:", unitPrice);
  console.log("🔍 [addItemDetailToAudit] Total quantity:", totalQuantity);
  console.log("🔍 [addItemDetailToAudit] Total price:", totalPrice);
  console.log("🔍 [addItemDetailToAudit] Saving to database...");

  const itemDetail = await prisma.itemDetails.create({
    data: {
      room_id,
      item_id,
      audit_id,
      active_quantity: active_quantity ?? 0,
      broken_quantity: broken_quantity ?? 0,
      inactive_quantity: inactive_quantity ?? 0,
      unit_price: unitPrice,
      total_price: totalPrice,
    },
    include: {
      room: true,
      item: true,
    },
  });

  console.log("✅ [addItemDetailToAudit] Saved to database!");
  console.log(
    "✅ [addItemDetailToAudit] Saved unit_price:",
    itemDetail.unit_price
  );
  console.log(
    "✅ [addItemDetailToAudit] Saved total_price:",
    itemDetail.total_price
  );
  console.log(
    "✅ [addItemDetailToAudit] Saved unit_price type:",
    typeof itemDetail.unit_price
  );
  console.log(
    "✅ [addItemDetailToAudit] Saved total_price type:",
    typeof itemDetail.total_price
  );

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
    throw new AppError(httpStatus.BAD_REQUEST, "Quantities cannot be negative");
  }

  const oldValues = {
    active: detail.active_quantity,
    broken: detail.broken_quantity,
    inactive: detail.inactive_quantity,
  };

  // Calculate updated quantities
  const newActiveQty =
    active_quantity !== undefined ? active_quantity : detail.active_quantity;
  const newBrokenQty =
    broken_quantity !== undefined ? broken_quantity : detail.broken_quantity;
  const newInactiveQty =
    inactive_quantity !== undefined
      ? inactive_quantity
      : detail.inactive_quantity;

  const oldTotalQty =
    detail.active_quantity + detail.broken_quantity + detail.inactive_quantity;
  const newTotalQty = newActiveQty + newBrokenQty + newInactiveQty;

  // Proportionally adjust total_price based on quantity change
  // This preserves the accurate purchase prices
  let newTotalPrice = Number(detail.total_price) || 0;

  if (oldTotalQty > 0 && newTotalQty !== oldTotalQty) {
    // Calculate price per unit from stored total_price
    const pricePerUnit = newTotalPrice / oldTotalQty;
    // Adjust total_price proportionally
    newTotalPrice = pricePerUnit * newTotalQty;
  }

  // Calculate average unit_price for reference
  const newUnitPrice =
    newTotalQty > 0 ? newTotalPrice / newTotalQty : detail.unit_price || 0;

  // Check if all quantities are zero after update - if so, delete the record
  if (newTotalQty === 0) {
    await prisma.itemDetails.delete({
      where: { id: detail_id },
    });

    // Log the deletion
    await prisma.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "ItemDetails",
        entity_id: detail.id,
        entity_name: `${detail.item.name} - ${detail.room.name}`,
        action_type: "DELETE",
        before: oldValues,
        description: `Removed ${detail.item.name} from ${detail.room.name} (all quantities = 0)`,
        metadata: {
          audit_id: detail.audit_id,
          room_id: detail.room_id,
          item_id: detail.item_id,
          auto_deleted: true,
        },
      },
    });

    return {
      message: "Item detail deleted (all quantities = 0)",
      deleted: true,
    };
  }

  const updatedDetail = await prisma.itemDetails.update({
    where: { id: detail_id },
    data: {
      ...(active_quantity !== undefined && { active_quantity }),
      ...(broken_quantity !== undefined && { broken_quantity }),
      ...(inactive_quantity !== undefined && { inactive_quantity }),
      unit_price: newUnitPrice,
      total_price: newTotalPrice,
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
  if (
    inactive_quantity !== undefined &&
    inactive_quantity !== oldValues.inactive
  ) {
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
        description: `Updated ${detail.item.name} in ${
          detail.room.name
        }: ${changes.join(", ")}`,
        metadata: {
          audit_id: detail.audit_id,
          room_id: detail.room_id,
          item_id: detail.item_id,
        },
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
      metadata: {
        audit_id: detail.audit_id,
        room_id: detail.room_id,
        item_id: detail.item_id,
      },
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

// ---------------- GET ITEM SUMMARY BY AUDIT ID ----------------
// Returns aggregated totals per item across all rooms
const getItemSummaryByAuditId = async (id: string): Promise<any> => {
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
    },
  });

  if (!audit) {
    console.log("❌ [Backend] Audit not found:", id);
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Get all item details for this audit
  const itemDetails = await prisma.itemDetails.findMany({
    where: { audit_id: id },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          category: true,
          sub_category: true,
          unit: true,
          unit_price: true,
        },
      },
    },
  });

  // Aggregate by item NAME (not ID) to group all items with same name
  const itemSummaryMap = new Map<string, any>();

  itemDetails.forEach((detail) => {
    const itemId = detail.item.id;
    const itemName = detail.item.name;
    const entryTotalPrice = Number(detail.total_price) || 0;

    // Use item name as key to group all items with same name together
    if (!itemSummaryMap.has(itemName)) {
      itemSummaryMap.set(itemName, {
        item_id: itemId, // Use first item's ID
        item_name: itemName,
        category: detail.item.category,
        sub_category: detail.item.sub_category,
        unit: detail.item.unit,
        active: 0,
        inactive: 0,
        damage: 0,
        lost: 0,
        total: 0,
        total_price: 0,
      });
    }

    const summary = itemSummaryMap.get(itemName);
    summary.active += detail.active_quantity;
    summary.inactive += detail.inactive_quantity;
    summary.damage += detail.broken_quantity;
    summary.lost += detail.lost_quantity || 0;
    const qty =
      detail.active_quantity +
      detail.inactive_quantity +
      detail.broken_quantity +
      (detail.lost_quantity || 0);
    summary.total += qty;
    // Sum the stored total_price from each entry (handles different prices per purchase)
    summary.total_price += entryTotalPrice;
  });

  // Convert map to array and sort by item name
  const itemSummary = Array.from(itemSummaryMap.values()).sort((a, b) =>
    a.item_name.localeCompare(b.item_name)
  );

  const result = {
    audit: {
      id: audit.id,
      month: audit.month,
      year: audit.year,
      status: audit.status,
    },
    summary: itemSummary,
  };

  return result;
};

// ---------------- CLEANUP ZERO QUANTITY ITEMS ----------------
// Remove ItemDetails records where all quantities are 0
const cleanupZeroQuantityItems = async (audit_id: string): Promise<number> => {
  const result = await prisma.itemDetails.deleteMany({
    where: {
      audit_id,
      active_quantity: 0,
      broken_quantity: 0,
      inactive_quantity: 0,
      lost_quantity: 0,
    },
  });

  console.log(
    `🧹 Cleaned up ${result.count} zero-quantity items from audit ${audit_id}`
  );
  return result.count;
};

// ---------------- SYNC AUDIT WITH ASSET PURCHASES ----------------
// Recalculate audit ItemDetails based on current AssetPurchase records
const syncAuditWithAssetPurchases = async (
  audit_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;

  const audit = await prisma.audit.findUnique({
    where: { id: audit_id },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Get all asset purchases
  const assetPurchases = await prisma.assetPurchase.findMany({
    include: {
      room: true,
      item: true,
    },
  });

  // Group by room_id + item_id + status
  // SERIAL NUMBER-BASED PRICING: Track each purchase separately to preserve individual prices
  const purchaseMap = new Map<string, any>();

  assetPurchases.forEach((purchase) => {
    const key = `${purchase.room_id}|${purchase.item_id}`;

    if (!purchaseMap.has(key)) {
      purchaseMap.set(key, {
        room_id: purchase.room_id,
        item_id: purchase.item_id,
        active: 0,
        inactive: 0,
        broken: 0,
        lost: 0,
        purchases: [],
        totalCost: 0, // Sum of all purchase costs (preserves individual prices)
      });
    }

    const entry = purchaseMap.get(key);
    entry.purchases.push(purchase);

    // Add purchase cost to total (this preserves serial number-based pricing)
    entry.totalCost += Number(purchase.total_cost) || 0;

    // Add to appropriate status bucket
    const status = purchase.status || "Active";
    switch (status) {
      case "Active":
        entry.active += purchase.quantity;
        break;
      case "Inactive":
        entry.inactive += purchase.quantity;
        break;
      case "Damage":
        entry.broken += purchase.quantity;
        break;
      case "Lost":
        entry.lost += purchase.quantity;
        break;
      default:
        entry.active += purchase.quantity;
    }
  });

  // Update or create ItemDetails for this audit
  await prisma.$transaction(async (tx) => {
    // First, delete all existing ItemDetails for this audit
    await tx.itemDetails.deleteMany({
      where: { audit_id },
    });

    // Create new ItemDetails based on asset purchases
    const itemDetailsToCreate = [];

    for (const [key, data] of purchaseMap.entries()) {
      const totalQty = data.active + data.inactive + data.broken + data.lost;

      // Only create if there's actual quantity
      if (totalQty > 0) {
        // SERIAL NUMBER-BASED PRICING:
        // Use the sum of all purchase costs (preserves individual prices)
        // Calculate average unit price for reference only
        const totalCost = data.totalCost;
        const avgUnitPrice = totalQty > 0 ? totalCost / totalQty : 0;

        console.log(
          `📊 [syncAudit] ${data.item_id}: ${totalQty} items, total_cost=₹${totalCost}, avg_unit=₹${avgUnitPrice}`
        );

        itemDetailsToCreate.push({
          audit_id,
          room_id: data.room_id,
          item_id: data.item_id,
          active_quantity: data.active,
          broken_quantity: data.broken,
          inactive_quantity: data.inactive,
          lost_quantity: data.lost,
          unit_price: avgUnitPrice,
          total_price: totalCost,
        });
      }
    }

    if (itemDetailsToCreate.length > 0) {
      await tx.itemDetails.createMany({
        data: itemDetailsToCreate,
      });
    }

    // Log the sync action
    await tx.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "Audit",
        entity_id: audit_id,
        entity_name: `Audit ${audit.month}/${audit.year}`,
        action_type: "UPDATE",
        description: `Synced audit with asset purchases - ${itemDetailsToCreate.length} items updated`,
        metadata: {
          synced_items: itemDetailsToCreate.length,
          source: "sync_with_asset_purchases",
        },
      },
    });
  });

  // Return updated audit
  return getAuditById(audit_id);
};

// ---------------- UPDATE ADJUSTMENT PERCENTAGE ----------------
// Updates the reduction percentage for an audit
const updateAdjustment = async (
  audit_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;
  const { reduction_percentage } = req.body as {
    reduction_percentage: number;
  };

  // Validate reduction percentage
  if (
    reduction_percentage === undefined ||
    reduction_percentage === null ||
    typeof reduction_percentage !== "number"
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Reduction percentage is required and must be a number"
    );
  }

  if (reduction_percentage < 0 || reduction_percentage > 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Reduction percentage must be between 0 and 100"
    );
  }

  // Check if audit exists
  const audit = await prisma.audit.findUnique({
    where: { id: audit_id },
    include: {
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Update the reduction percentage
  const updatedAudit = await prisma.audit.update({
    where: { id: audit_id },
    data: {
      reduction_percentage,
    },
    include: {
      itemDetails: {
        include: {
          room: true,
          item: true,
        },
      },
      participants: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Filter only items with quantity > 0 for calculations
  const activeItems = updatedAudit.itemDetails.filter((detail: any) => {
    const totalQty =
      detail.active_quantity +
      detail.broken_quantity +
      detail.inactive_quantity +
      (detail.lost_quantity || 0);
    return totalQty > 0;
  });

  // Convert Prisma Decimal types to numbers for shared calculation function
  const itemDetailsForCalculation = activeItems.map((detail: any) => ({
    active_quantity: detail.active_quantity,
    broken_quantity: detail.broken_quantity,
    inactive_quantity: detail.inactive_quantity,
    lost_quantity: detail.lost_quantity || 0,
    total_price: Number(detail.total_price) || 0,
    item: {
      name: detail.item?.name || "Unknown",
    },
  }));

  // Use shared calculation function to ensure consistency with Dashboard
  const { totalAssetValue, adjustedAssetValue, reductionAmount } =
    calculateAdjustedAssetValue(
      itemDetailsForCalculation,
      Number(reduction_percentage)
    );

  // Return audit with calculated values
  return {
    ...updatedAudit,
    itemDetails: activeItems, // Return only active items
    total_asset_value: totalAssetValue,
    adjusted_asset_value: adjustedAssetValue,
    reduction_amount: reductionAmount,
  };
};

// ---------------- GET DASHBOARD TOTALS ----------------
// Returns total values using the same calculation as Adjusted Report
const getDashboardTotals = async (audit_id?: string): Promise<any> => {
  let audit;

  if (audit_id) {
    audit = await prisma.audit.findUnique({
      where: { id: audit_id },
      include: {
        itemDetails: {
          include: {
            item: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  } else {
    // Get latest audit
    audit = await prisma.audit.findFirst({
      include: {
        itemDetails: {
          include: {
            item: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
    });
  }

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  // Filter only items with quantity > 0
  const activeItems = audit.itemDetails.filter((detail: any) => {
    const totalQty =
      detail.active_quantity +
      detail.broken_quantity +
      detail.inactive_quantity +
      (detail.lost_quantity || 0);
    return totalQty > 0;
  });

  // Convert Prisma Decimal types to numbers for shared calculation function
  const itemDetailsForCalculation = activeItems.map((detail: any) => ({
    active_quantity: detail.active_quantity,
    broken_quantity: detail.broken_quantity,
    inactive_quantity: detail.inactive_quantity,
    lost_quantity: detail.lost_quantity || 0,
    total_price: Number(detail.total_price) || 0,
    item: {
      name: detail.item?.name || "Unknown",
    },
  }));

  // Use shared calculation function for consistency
  const totalValue = calculateTotalAssetValue(itemDetailsForCalculation);

  // Calculate status-wise totals
  let totalActive = 0;
  let totalBroken = 0;
  let totalInactive = 0;
  let totalLost = 0;

  activeItems.forEach((detail: any) => {
    totalActive += detail.active_quantity || 0;
    totalBroken += detail.broken_quantity || 0;
    totalInactive += detail.inactive_quantity || 0;
    totalLost += detail.lost_quantity || 0;
  });

  return {
    audit: {
      id: audit.id,
      month: audit.month,
      year: audit.year,
      status: audit.status,
    },
    totals: {
      totalValue,
      totalActive,
      totalBroken,
      totalInactive,
      totalLost,
      totalItems: totalActive + totalBroken + totalInactive + totalLost,
    },
  };
};

// ---------------- GET STATUS HISTORY (MONTH-WISE) ----------------
// Returns month-wise breakdown for a specific status across all audits
const getStatusHistory = async (status: string): Promise<any> => {
  // Validate status
  const validStatuses = ["Active", "Inactive", "Damage", "Lost"];
  if (!validStatuses.includes(status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Get all audits with their item details
  const audits = await prisma.audit.findMany({
    include: {
      itemDetails: {
        include: {
          room: {
            select: {
              id: true,
              name: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              sub_category: true,
            },
          },
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Map status to quantity field
  const statusFieldMap: Record<string, string> = {
    Active: "active_quantity",
    Inactive: "inactive_quantity",
    Damage: "broken_quantity",
    Lost: "lost_quantity",
  };

  const quantityField = statusFieldMap[status];

  // Process each audit
  const monthlyData = audits.map((audit) => {
    // Get month name
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthName = monthNames[audit.month - 1] || "Unknown";

    // Group by item name, then by room
    const itemMap = new Map<string, any>();

    audit.itemDetails.forEach((detail: any) => {
      const quantity = detail[quantityField] || 0;

      // Skip if no quantity for this status
      if (quantity === 0) return;

      const itemName = detail.item?.name || "Unknown";
      const subCategory = detail.item?.sub_category || null;
      const roomName = detail.room?.name || "Unknown Room";
      const roomId = detail.room?.id || "";

      // Calculate value for this specific quantity
      const totalQty =
        (detail.active_quantity || 0) +
        (detail.broken_quantity || 0) +
        (detail.inactive_quantity || 0) +
        (detail.lost_quantity || 0);
      const totalPrice = Number(detail.total_price) || 0;
      const pricePerUnit = totalQty > 0 ? totalPrice / totalQty : 0;
      const value = pricePerUnit * quantity;

      // Create unique key for item-room combination
      const itemRoomKey = `${itemName}-${roomId}`;

      // Initialize item if not exists
      if (!itemMap.has(itemRoomKey)) {
        itemMap.set(itemRoomKey, {
          itemName,
          subCategory,
          rooms: [],
          totalQuantity: 0,
          totalValue: 0,
        });
      }

      const item = itemMap.get(itemRoomKey);

      // Add room data (each item-room combination is separate)
      item.rooms.push({
        roomId,
        roomName,
        quantity,
        value,
      });

      item.totalQuantity += quantity;
      item.totalValue += value;
    });

    // Convert map to array and sort by item name
    const items = Array.from(itemMap.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName)
    );

    // Calculate totals for this month
    const totalQuantity = items.reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    );
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      audit: {
        id: audit.id,
        month: audit.month,
        year: audit.year,
        monthName,
        status: audit.status,
      },
      items,
      totalQuantity,
      totalValue,
    };
  });

  // Filter out months with no items for this status
  const filteredData = monthlyData.filter((data) => data.items.length > 0);

  return {
    status,
    monthlyData: filteredData,
  };
};

// Import price recalculation functions
import {
  recalculateAuditPrices,
  recalculateLatestAuditPrices,
  recalculateItemPrices,
} from "./recalculatePrices.service";

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
  getItemSummaryByAuditId,
  updateAdjustment,
  cleanupZeroQuantityItems,
  syncAuditWithAssetPurchases,
  getDashboardTotals,
  getStatusHistory,
  recalculateAuditPrices,
  recalculateLatestAuditPrices,
  recalculateItemPrices,
};
