// grant-all-permissions.js
// Run this to grant all permissions to admin users

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantAllPermissions() {
  try {
    console.log('🔄 Granting all permissions to ADMIN users...\n');

    // Get all permissions
    const allPermissions = await prisma.permission.findMany();
    console.log(`✅ Found ${allPermissions.length} permissions\n`);

    // Get all ADMIN users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { permissions: true }
    });

    console.log(`✅ Found ${adminUsers.length} ADMIN users\n`);

    if (adminUsers.length === 0) {
      console.log('❌ No ADMIN users found!');
      console.log('💡 Make sure you have at least one user with role="ADMIN"\n');
      return;
    }

    // Grant all permissions to each admin
    for (const admin of adminUsers) {
      console.log(`👤 Processing: ${admin.email}`);
      
      // Get permission IDs this user already has
      const existingPermissionIds = admin.permissions.map(p => p.id);
      
      // Find permissions they don't have
      const missingPermissions = allPermissions.filter(
        p => !existingPermissionIds.includes(p.id)
      );

      if (missingPermissions.length === 0) {
        console.log(`   ✅ Already has all permissions (${allPermissions.length})\n`);
        continue;
      }

      // Grant missing permissions
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          permissions: {
            connect: missingPermissions.map(p => ({ id: p.id }))
          }
        }
      });

      console.log(`   ✅ Granted ${missingPermissions.length} new permissions`);
      console.log(`   ✅ Total permissions: ${allPermissions.length}\n`);
    }

    console.log('🎉 All ADMIN users now have all permissions!\n');
    console.log('📝 Next steps:');
    console.log('   1. Clear browser storage (localStorage.clear())');
    console.log('   2. Refresh the page');
    console.log('   3. Login again\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

grantAllPermissions();
