// ========================================
// DIRECT FIX: Sync Dashboard Counts
// ========================================
// Run this script directly: node fix-dashboard-sync.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncDashboard() {
  console.log('🔄 Starting dashboard sync...\n');

  try {
    // Get latest audit
    const latestAudit = await prisma.audit.findFirst({
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { created_at: 'desc' }],
    });

    if (!latestAudit) {
      console.log('❌ No audit found');
      return;
    }

    console.log(`✅ Found latest audit: ${latestAudit.month}/${latestAudit.year} (ID: ${latestAudit.id})\n`);

    // Get current counts BEFORE sync
    const beforeCounts = await prisma.itemDetails.aggregate({
      where: { audit_id: latestAudit.id },
      _sum: {
        active_quantity: true,
        broken_quantity: true,
        inactive_quantity: true,
        lost_quantity: true,
      },
    });

    console.log('📊 BEFORE SYNC (ItemDetails):');
    console.log(`   Active: ${beforeCounts._sum.active_quantity || 0}`);
    console.log(`   Broken: ${beforeCounts._sum.broken_quantity || 0}`);
    console.log(`   Inactive: ${beforeCounts._sum.inactive_quantity || 0}`);
    console.log(`   Lost: ${beforeCounts._sum.lost_quantity || 0}\n`);

    // Get AssetPurchase counts
    const assetPurchases = await prisma.assetPurchase.findMany({
      select: { status: true },
    });

    const apCounts = {
      active: assetPurchases.filter(p => (p.status || 'Active') === 'Active').length,
      broken: assetPurchases.filter(p => p.status === 'Damage').length,
      inactive: assetPurchases.filter(p => p.status === 'Inactive').length,
      lost: assetPurchases.filter(p => p.status === 'Lost').length,
    };

    console.log('📊 CURRENT (AssetPurchase):');
    console.log(`   Active: ${apCounts.active}`);
    console.log(`   Broken: ${apCounts.broken}`);
    console.log(`   Inactive: ${apCounts.inactive}`);
    console.log(`   Lost: ${apCounts.lost}\n`);

    // Perform sync
    console.log('🔄 Syncing ItemDetails with AssetPurchase...\n');

    // Step 1: Reset all quantities for serial-tracked items
    await prisma.itemDetails.updateMany({
      where: {
        audit_id: latestAudit.id,
        item_serial_no: { not: null },
      },
      data: {
        active_quantity: 0,
        broken_quantity: 0,
        inactive_quantity: 0,
        lost_quantity: 0,
      },
    });

    console.log('✅ Reset all quantities to 0');

    // Step 2: Update based on AssetPurchase status
    const allPurchases = await prisma.assetPurchase.findMany({
      where: { serial_number: { not: null } },
      include: { item: true, room: true },
    });

    let updated = 0;
    for (const purchase of allPurchases) {
      const status = purchase.status || 'Active';
      const statusField = 
        status === 'Active' ? 'active_quantity' :
        status === 'Inactive' ? 'inactive_quantity' :
        status === 'Damage' ? 'broken_quantity' :
        status === 'Lost' ? 'lost_quantity' : 'active_quantity';

      const result = await prisma.itemDetails.updateMany({
        where: {
          audit_id: latestAudit.id,
          item_serial_no: purchase.serial_number,
        },
        data: {
          [statusField]: 1,
        },
      });

      if (result.count > 0) {
        updated++;
        console.log(`   ✓ ${purchase.serial_number}: ${status}`);
      }
    }

    console.log(`\n✅ Updated ${updated} items\n`);

    // Get counts AFTER sync
    const afterCounts = await prisma.itemDetails.aggregate({
      where: { audit_id: latestAudit.id },
      _sum: {
        active_quantity: true,
        broken_quantity: true,
        inactive_quantity: true,
        lost_quantity: true,
      },
    });

    console.log('📊 AFTER SYNC (ItemDetails):');
    console.log(`   Active: ${afterCounts._sum.active_quantity || 0} (${(afterCounts._sum.active_quantity || 0) - (beforeCounts._sum.active_quantity || 0) >= 0 ? '+' : ''}${(afterCounts._sum.active_quantity || 0) - (beforeCounts._sum.active_quantity || 0)})`);
    console.log(`   Broken: ${afterCounts._sum.broken_quantity || 0} (${(afterCounts._sum.broken_quantity || 0) - (beforeCounts._sum.broken_quantity || 0) >= 0 ? '+' : ''}${(afterCounts._sum.broken_quantity || 0) - (beforeCounts._sum.broken_quantity || 0)})`);
    console.log(`   Inactive: ${afterCounts._sum.inactive_quantity || 0} (${(afterCounts._sum.inactive_quantity || 0) - (beforeCounts._sum.inactive_quantity || 0) >= 0 ? '+' : ''}${(afterCounts._sum.inactive_quantity || 0) - (beforeCounts._sum.inactive_quantity || 0)})`);
    console.log(`   Lost: ${afterCounts._sum.lost_quantity || 0} (${(afterCounts._sum.lost_quantity || 0) - (beforeCounts._sum.lost_quantity || 0) >= 0 ? '+' : ''}${(afterCounts._sum.lost_quantity || 0) - (beforeCounts._sum.lost_quantity || 0)})\n`);

    console.log('✅ ========================================');
    console.log('✅ SYNC COMPLETED SUCCESSFULLY!');
    console.log('✅ ========================================\n');
    console.log('👉 Refresh your Dashboard to see the updated counts!\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncDashboard();
