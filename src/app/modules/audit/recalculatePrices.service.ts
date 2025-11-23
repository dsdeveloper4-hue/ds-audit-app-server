// modules/audit/recalculatePrices.service.ts
import prisma from "@app/lib/prisma";
import { Request } from "express";
import { User } from "@prisma/client";
import AppError from "@app/errors/AppError";
import httpStatus from "http-status";

/**
 * Recalculate prices for ItemDetails in an audit based on latest asset purchases
 * This updates the latest audit to reflect current market prices
 */
export const recalculateAuditPrices = async (
  audit_id: string,
  req: Request
): Promise<any> => {
  const user = req.user as User;

  const audit = await prisma.audit.findUnique({
    where: { id: audit_id },
    include: {
      itemDetails: {
        include: {
          item: true,
          room: true,
        },
      },
    },
  });

  if (!audit) {
    throw new AppError(httpStatus.NOT_FOUND, "Audit not found");
  }

  console.log(
    `🔄 [recalculateAuditPrices] Starting price recalculation for audit ${audit.month}/${audit.year}`
  );

  let updatedCount = 0;
  let totalOldValue = 0;
  let totalNewValue = 0;

  await prisma.$transaction(async (tx) => {
    for (const itemDetail of audit.itemDetails) {
      // SERIAL NUMBER-BASED PRICING:
      // Get ALL asset purchases for this item in this room
      const assetPurchases = await tx.assetPurchase.findMany({
        where: {
          item_id: itemDetail.item_id,
          room_id: itemDetail.room_id,
        },
        orderBy: [{ purchase_date: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          unit_price: true,
          quantity: true,
          total_cost: true,
          serial_number: true,
        },
      });

      if (assetPurchases.length === 0) {
        console.log(
          `⚠️ No purchases found for ${itemDetail.item.name} in ${itemDetail.room.name}, skipping`
        );
        continue;
      }

      // Calculate total price by summing all purchase costs (preserves individual prices)
      let newTotalPrice = 0;
      let totalPurchasedQty = 0;

      assetPurchases.forEach((purchase) => {
        const cost = Number(purchase.total_cost) || 0;
        newTotalPrice += cost;
        totalPurchasedQty += purchase.quantity;
      });

      // Calculate average unit price for reference
      const newUnitPrice =
        totalPurchasedQty > 0 ? newTotalPrice / totalPurchasedQty : 0;
      const oldUnitPrice = Number(itemDetail.unit_price) || 0;
      const oldTotalPrice = Number(itemDetail.total_price) || 0;

      // Update if price has changed
      if (
        Math.abs(newTotalPrice - oldTotalPrice) > 0.01 ||
        Math.abs(newUnitPrice - oldUnitPrice) > 0.01
      ) {
        totalOldValue += oldTotalPrice;
        totalNewValue += newTotalPrice;

        await tx.itemDetails.update({
          where: { id: itemDetail.id },
          data: {
            unit_price: newUnitPrice,
            total_price: newTotalPrice,
          },
        });

        updatedCount++;

        console.log(
          `✅ Updated ${itemDetail.item.name} in ${itemDetail.room.name}: ` +
            `total: ₹${oldTotalPrice.toFixed(2)} → ₹${newTotalPrice.toFixed(
              2
            )} (${assetPurchases.length} purchases summed)`
        );
      }
    }

    // Log the recalculation in history
    if (updatedCount > 0) {
      await tx.recentActivityHistory.create({
        data: {
          user_id: user.id,
          entity_type: "Audit",
          entity_id: audit_id,
          entity_name: `Audit ${audit.month}/${audit.year}`,
          action_type: "UPDATE",
          description: `Recalculated prices using serial number-based pricing for ${updatedCount} items. Total value: ₹${totalOldValue.toFixed(
            2
          )} → ₹${totalNewValue.toFixed(2)}`,
          metadata: {
            items_updated: updatedCount,
            old_total_value: totalOldValue,
            new_total_value: totalNewValue,
            value_change: totalNewValue - totalOldValue,
            source: "serial_number_price_recalculation",
          },
        },
      });
    }
  });

  console.log(
    `✅ [recalculateAuditPrices] Completed: ${updatedCount} items updated`
  );
  console.log(
    `   Old total value: ${totalOldValue.toFixed(
      2
    )}, New total value: ${totalNewValue.toFixed(2)}`
  );

  return {
    success: true,
    items_updated: updatedCount,
    old_total_value: totalOldValue,
    new_total_value: totalNewValue,
    value_change: totalNewValue - totalOldValue,
  };
};

/**
 * Automatically recalculate prices for the latest audit
 * This should be called after item prices are updated
 */
export const recalculateLatestAuditPrices = async (
  req: Request
): Promise<any> => {
  const latestAudit = await prisma.audit.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
  });

  if (!latestAudit) {
    console.log("⚠️ No audit found to recalculate");
    return { success: false, message: "No audit found" };
  }

  console.log(
    `🔄 Recalculating prices for latest audit: ${latestAudit.month}/${latestAudit.year}`
  );

  return recalculateAuditPrices(latestAudit.id, req);
};

/**
 * Recalculate prices for a specific item across all audits or just the latest
 */
export const recalculateItemPrices = async (
  item_id: string,
  req: Request,
  latestOnly: boolean = true
): Promise<any> => {
  const user = req.user as User;

  // Get the latest purchase price for this item
  const latestPurchase = await prisma.assetPurchase.findFirst({
    where: { item_id },
    orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
    select: { unit_price: true, item: { select: { name: true } } },
  });

  if (!latestPurchase) {
    throw new AppError(httpStatus.NOT_FOUND, "No purchase found for this item");
  }

  const newUnitPrice = Number(latestPurchase.unit_price);

  console.log(
    `🔄 [recalculateItemPrices] Updating ${latestPurchase.item.name} to price: ${newUnitPrice}`
  );

  // Find audits to update
  const auditsToUpdate = latestOnly
    ? await prisma.audit.findMany({
        orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
        take: 1,
      })
    : await prisma.audit.findMany();

  let totalUpdated = 0;

  await prisma.$transaction(async (tx) => {
    for (const audit of auditsToUpdate) {
      const itemDetails = await tx.itemDetails.findMany({
        where: {
          audit_id: audit.id,
          item_id,
        },
        include: {
          room: true,
        },
      });

      for (const itemDetail of itemDetails) {
        // SERIAL NUMBER-BASED PRICING:
        // Get ALL asset purchases for this item in this room
        const assetPurchases = await tx.assetPurchase.findMany({
          where: {
            item_id: itemDetail.item_id,
            room_id: itemDetail.room_id,
          },
          select: {
            total_cost: true,
            quantity: true,
          },
        });

        if (assetPurchases.length === 0) {
          console.log(`⚠️ No purchases for ${itemDetail.room.name}, skipping`);
          continue;
        }

        // Sum all purchase costs (serial number-based pricing)
        let newTotalPrice = 0;
        let totalPurchasedQty = 0;

        assetPurchases.forEach((purchase) => {
          newTotalPrice += Number(purchase.total_cost) || 0;
          totalPurchasedQty += purchase.quantity;
        });

        const newUnitPrice =
          totalPurchasedQty > 0 ? newTotalPrice / totalPurchasedQty : 0;
        const oldTotalPrice = Number(itemDetail.total_price) || 0;

        if (Math.abs(newTotalPrice - oldTotalPrice) > 0.01) {
          await tx.itemDetails.update({
            where: { id: itemDetail.id },
            data: {
              unit_price: newUnitPrice,
              total_price: newTotalPrice,
            },
          });

          totalUpdated++;

          console.log(
            `✅ Updated in audit ${audit.month}/${audit.year} (${itemDetail.room.name}): ₹${oldTotalPrice} → ₹${newTotalPrice}`
          );
        }
      }
    }

    // Log the update
    if (totalUpdated > 0) {
      await tx.recentActivityHistory.create({
        data: {
          user_id: user.id,
          entity_type: "Item",
          entity_id: item_id,
          entity_name: latestPurchase.item.name,
          action_type: "UPDATE",
          description: `Updated prices using serial number-based pricing across ${totalUpdated} audit entries`,
          metadata: {
            audits_affected: auditsToUpdate.length,
            entries_updated: totalUpdated,
            source: "serial_number_item_price_recalculation",
          },
        },
      });
    }
  });

  console.log(
    `✅ [recalculateItemPrices] Completed: ${totalUpdated} entries updated across ${auditsToUpdate.length} audit(s)`
  );

  return {
    success: true,
    item_name: latestPurchase.item.name,
    new_unit_price: newUnitPrice,
    audits_affected: auditsToUpdate.length,
    entries_updated: totalUpdated,
  };
};
