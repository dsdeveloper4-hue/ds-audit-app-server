// Run this script to fix existing ItemDetails with ৳0.00 prices
// Usage: node fix-existing-prices.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingPrices() {
  console.log('🔧 Starting to fix existing ItemDetails with zero prices...\n');

  try {
    // Get all ItemDetails with zero or null total_price
    const itemDetailsWithZeroPrice = await prisma.itemDetails.findMany({
      where: {
        OR: [
          { total_price: 0 },
          { total_price: null },
        ],
      },
      include: {
        item: true,
        room: true,
      },
    });

    console.log(`Found ${itemDetailsWithZeroPrice.length} items with zero price\n`);

    let fixed = 0;
    let skipped = 0;

    for (const detail of itemDetailsWithZeroPrice) {
      console.log(`\n📦 Processing: ${detail.item.name} in ${detail.room.name}`);
      
      // Get latest purchase price for this item
      const latestPurchase = await prisma.assetPurchase.findFirst({
        where: { item_id: detail.item_id },
        orderBy: { purchase_date: 'desc' },
        select: { unit_price: true },
      });

      let unitPrice = 0;
      
      if (latestPurchase?.unit_price) {
        unitPrice = Number(latestPurchase.unit_price);
        console.log(`  ✅ Found purchase price: ৳${unitPrice}`);
      } else if (detail.item.unit_price) {
        unitPrice = Number(detail.item.unit_price);
        console.log(`  ⚠️  Using item master price: ৳${unitPrice}`);
      } else {
        console.log(`  ❌ No price found - skipping`);
        skipped++;
        continue;
      }

      const totalQty = detail.active_quantity + detail.broken_quantity + detail.inactive_quantity;
      const totalPrice = unitPrice * totalQty;

      console.log(`  📊 Quantity: ${totalQty}`);
      console.log(`  💰 Calculated total: ৳${totalPrice}`);

      // Update the ItemDetails
      await prisma.itemDetails.update({
        where: { id: detail.id },
        data: {
          unit_price: unitPrice,
          total_price: totalPrice,
        },
      });

      console.log(`  ✅ Updated!`);
      fixed++;
    }

    console.log(`\n\n✅ Done!`);
    console.log(`   Fixed: ${fixed} items`);
    console.log(`   Skipped: ${skipped} items (no price available)`);
    
    if (skipped > 0) {
      console.log(`\n⚠️  ${skipped} items still have no price.`);
      console.log(`   Please add asset purchases or set unit_price in item master.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingPrices();
