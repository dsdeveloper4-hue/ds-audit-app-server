import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateItemPrices() {
  console.log("🔄 Starting to update item prices in ItemDetails...");

  try {
    // Get all item details
    const itemDetails = await prisma.itemDetails.findMany({
      include: {
        item: true,
      },
    });

    console.log(`📊 Found ${itemDetails.length} item details to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const detail of itemDetails) {
      const unitPrice = detail.item.unit_price || 0;
      const totalQuantity =
        detail.active_quantity +
        detail.broken_quantity +
        detail.inactive_quantity;
      const totalPrice = Number(unitPrice) * totalQuantity;

      // Only update if prices are different or not set
      const currentUnitPrice = detail.unit_price
        ? Number(detail.unit_price)
        : 0;
      const currentTotalPrice = detail.total_price
        ? Number(detail.total_price)
        : 0;

      if (
        currentUnitPrice !== Number(unitPrice) ||
        currentTotalPrice !== totalPrice
      ) {
        await prisma.itemDetails.update({
          where: { id: detail.id },
          data: {
            unit_price: unitPrice,
            total_price: totalPrice,
          },
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} item details`);
    console.log(
      `⏭️  Skipped ${skippedCount} item details (already up to date)`
    );
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error updating item prices:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateItemPrices();
