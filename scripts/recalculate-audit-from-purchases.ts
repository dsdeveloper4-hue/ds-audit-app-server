import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Recalculate all ItemDetails in the latest audit based on current AssetPurchases
 * This ensures the audit data matches the actual asset purchases
 */
async function recalculateAuditFromPurchases() {
  console.log("🔄 Starting audit recalculation from asset purchases...\n");

  // Get the latest audit
  const latestAudit = await prisma.audit.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
  });

  if (!latestAudit) {
    console.log("❌ No audit found!");
    return;
  }

  console.log(
    `📋 Latest Audit: ${latestAudit.month}/${latestAudit.year} (ID: ${latestAudit.id})\n`
  );

  // Get all asset purchases
  const allPurchases = await prisma.assetPurchase.findMany({
    include: {
      room: true,
      item: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  console.log(`📦 Found ${allPurchases.length} asset purchases\n`);

  // Delete all existing ItemDetails for this audit
  const deletedCount = await prisma.itemDetails.deleteMany({
    where: {
      audit_id: latestAudit.id,
    },
  });

  console.log(
    `🗑️  Deleted ${deletedCount.count} existing ItemDetails records\n`
  );

  // Group purchases by serial number and aggregated items
  const serialPurchases: any[] = [];
  const aggregatedPurchases = new Map<
    string,
    {
      room_id: string;
      item_id: string;
      room_name: string;
      item_name: string;
      purchases: any[];
    }
  >();

  allPurchases.forEach((purchase) => {
    if (purchase.serial_number) {
      // Serial-tracked item
      serialPurchases.push(purchase);
    } else {
      // Aggregated item
      const key = `${purchase.room_id}_${purchase.item_id}`;
      if (!aggregatedPurchases.has(key)) {
        aggregatedPurchases.set(key, {
          room_id: purchase.room_id,
          item_id: purchase.item_id,
          room_name: purchase.room.name,
          item_name: purchase.item.name,
          purchases: [],
        });
      }
      aggregatedPurchases.get(key)!.purchases.push(purchase);
    }
  });

  console.log(`📊 Processing:`);
  console.log(`   - Serial items: ${serialPurchases.length}`);
  console.log(`   - Aggregated groups: ${aggregatedPurchases.size}\n`);

  let createdCount = 0;

  // Process serial-tracked items
  for (const purchase of serialPurchases) {
    const statusField =
      purchase.status === "Active"
        ? "active_quantity"
        : purchase.status === "Inactive"
        ? "inactive_quantity"
        : purchase.status === "Damage"
        ? "broken_quantity"
        : purchase.status === "Lost"
        ? "lost_quantity"
        : "active_quantity";

    const quantities = {
      active_quantity: 0,
      broken_quantity: 0,
      inactive_quantity: 0,
      lost_quantity: 0,
    };
    quantities[statusField as keyof typeof quantities] = 1;

    await prisma.itemDetails.create({
      data: {
        room_id: purchase.room_id,
        item_id: purchase.item_id,
        audit_id: latestAudit.id,
        item_serial_no: purchase.serial_number,
        asset_purchase_id: purchase.id,
        ...quantities,
        unit_price: purchase.unit_price,
        total_price: purchase.unit_price, // For serial items, total = unit price
      },
    });

    createdCount++;
    console.log(
      `✅ Created serial item: ${purchase.item.name} (${purchase.serial_number}) - ${purchase.room.name} [${purchase.status}]`
    );
  }

  // Process aggregated items
  for (const [key, group] of aggregatedPurchases.entries()) {
    const quantities = {
      active_quantity: 0,
      broken_quantity: 0,
      inactive_quantity: 0,
      lost_quantity: 0,
    };

    let totalCost = 0;

    // Sum up quantities by status
    group.purchases.forEach((purchase) => {
      const status = purchase.status || "Active";
      const qty = purchase.quantity;
      const cost = Number(purchase.total_cost);

      if (status === "Active") {
        quantities.active_quantity += qty;
      } else if (status === "Inactive") {
        quantities.inactive_quantity += qty;
      } else if (status === "Damage") {
        quantities.broken_quantity += qty;
      } else if (status === "Lost") {
        quantities.lost_quantity += qty;
      }

      totalCost += cost;
    });

    const totalQty =
      quantities.active_quantity +
      quantities.broken_quantity +
      quantities.inactive_quantity +
      quantities.lost_quantity;

    const unitPrice = totalQty > 0 ? totalCost / totalQty : 0;

    await prisma.itemDetails.create({
      data: {
        room_id: group.room_id,
        item_id: group.item_id,
        audit_id: latestAudit.id,
        item_serial_no: null,
        ...quantities,
        unit_price: unitPrice,
        total_price: totalCost,
      },
    });

    createdCount++;
    console.log(
      `✅ Created aggregated: ${group.item_name} - ${
        group.room_name
      } [Total: ${totalQty}, Value: ৳${totalCost.toFixed(2)}]`
    );
  }

  console.log(`\n🎉 Recalculation complete!`);
  console.log(`   - Created ${createdCount} ItemDetails records`);
  console.log(`   - Audit ${latestAudit.month}/${latestAudit.year} updated\n`);

  // Calculate and display totals
  const allItemDetails = await prisma.itemDetails.findMany({
    where: {
      audit_id: latestAudit.id,
    },
  });

  const totalValue = allItemDetails.reduce(
    (sum, detail) => sum + Number(detail.total_price || 0),
    0
  );

  const totalActive = allItemDetails.reduce(
    (sum, detail) => sum + detail.active_quantity,
    0
  );
  const totalInactive = allItemDetails.reduce(
    (sum, detail) => sum + detail.inactive_quantity,
    0
  );
  const totalBroken = allItemDetails.reduce(
    (sum, detail) => sum + detail.broken_quantity,
    0
  );
  const totalLost = allItemDetails.reduce(
    (sum, detail) => sum + (detail.lost_quantity || 0),
    0
  );

  console.log(`📊 Audit Summary:`);
  console.log(`   - Total Value: ৳${totalValue.toFixed(2)}`);
  console.log(`   - Active: ${totalActive}`);
  console.log(`   - Inactive: ${totalInactive}`);
  console.log(`   - Broken: ${totalBroken}`);
  console.log(`   - Lost: ${totalLost}`);
  console.log(
    `   - Total Items: ${
      totalActive + totalInactive + totalBroken + totalLost
    }\n`
  );

  // Compare with asset purchases
  const purchasesTotalValue = allPurchases.reduce(
    (sum, p) => sum + Number(p.total_cost),
    0
  );

  console.log(`💰 Comparison:`);
  console.log(`   - Asset Purchases Total: ৳${purchasesTotalValue.toFixed(2)}`);
  console.log(`   - Audit Total: ৳${totalValue.toFixed(2)}`);
  console.log(
    `   - Match: ${totalValue === purchasesTotalValue ? "✅ YES" : "❌ NO"}\n`
  );
}

recalculateAuditFromPurchases()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
