// ========================================
// Complete Permission System Fix
// ========================================
// Run this script: node fix-permissions-completely.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPermissions() {
  console.log('🔧 Fixing Permission System...\n');

  try {
    // Step 1: Verify all permissions exist
    console.log('📋 Step 1: Verifying permissions...');
    const allPermissions = await prisma.permission.findMany();
    console.log(`   Found ${allPermissions.length} permissions in database\n`);

    // Step 2: Grant all permissions to ADMIN role
    console.log('🔐 Step 2: Granting permissions to ADMIN role...');
    
    let granted = 0;
    let alreadyHad = 0;

    for (const permission of allPermissions) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permission_id: {
            role: 'ADMIN',
            permission_id: permission.id,
          },
        },
      });

      if (existing) {
        alreadyHad++;
      } else {
        await prisma.rolePermission.create({
          data: {
            role: 'ADMIN',
            permission_id: permission.id,
          },
        });
        granted++;
        console.log(`   ✅ Granted: ${permission.name}`);
      }
    }

    console.log(`\n   Summary: ${granted} granted, ${alreadyHad} already had\n`);

    // Step 3: Verify SUPER_ADMIN has all permissions
    console.log('🔐 Step 3: Verifying SUPER_ADMIN permissions...');
    
    let superGranted = 0;
    for (const permission of allPermissions) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permission_id: {
            role: 'SUPER_ADMIN',
            permission_id: permission.id,
          },
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            role: 'SUPER_ADMIN',
            permission_id: permission.id,
          },
        });
        superGranted++;
      }
    }

    if (superGranted > 0) {
      console.log(`   ✅ Granted ${superGranted} permissions to SUPER_ADMIN\n`);
    } else {
      console.log(`   ✅ SUPER_ADMIN already has all permissions\n`);
    }

    // Step 4: Show permission breakdown by role
    console.log('📊 Step 4: Permission breakdown by role:\n');

    for (const role of ['SUPER_ADMIN', 'ADMIN', 'USER']) {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });

      const grouped = rolePerms.reduce((acc, rp) => {
        const category = rp.permission.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(rp.permission.name);
        return acc;
      }, {});

      console.log(`   ${role}:`);
      console.log(`   Total: ${rolePerms.length} permissions`);
      Object.entries(grouped).forEach(([category, perms]) => {
        console.log(`     - ${category}: ${perms.length}`);
      });
      console.log('');
    }

    // Step 5: Test permission checking
    console.log('🧪 Step 5: Testing permission system...\n');

    // Find an admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (adminUser) {
      // Get their permissions
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role: 'ADMIN' },
        include: { permission: true },
      });

      const userPermissions = await prisma.userPermission.findMany({
        where: { user_id: adminUser.id },
        include: { permission: true },
      });

      const permissionSet = new Set(rolePermissions.map(rp => rp.permission.name));
      
      userPermissions.forEach(up => {
        if (up.granted) {
          permissionSet.add(up.permission.name);
        } else {
          permissionSet.delete(up.permission.name);
        }
      });

      console.log(`   Testing with user: ${adminUser.name} (${adminUser.role})`);
      console.log(`   Total permissions: ${permissionSet.size}`);
      console.log(`   Sample permissions:`);
      Array.from(permissionSet).slice(0, 5).forEach(p => {
        console.log(`     ✅ ${p}`);
      });
      console.log('');
    }

    // Step 6: Verify critical permissions
    console.log('🔍 Step 6: Verifying critical permissions...\n');

    const criticalPermissions = [
      'view_dashboard',
      'view_audits',
      'view_items',
      'view_users',
      'manage_permissions',
    ];

    for (const permName of criticalPermissions) {
      const perm = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (!perm) {
        console.log(`   ❌ Missing: ${permName}`);
      } else {
        const adminHas = await prisma.rolePermission.findUnique({
          where: {
            role_permission_id: {
              role: 'ADMIN',
              permission_id: perm.id,
            },
          },
        });

        if (adminHas) {
          console.log(`   ✅ ${permName}`);
        } else {
          console.log(`   ⚠️  ${permName} - ADMIN doesn't have this!`);
        }
      }
    }

    console.log('\n✅ ========================================');
    console.log('✅ PERMISSION SYSTEM FIXED!');
    console.log('✅ ========================================\n');
    console.log('👉 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Log out and log back in');
    console.log('   3. Test the permission system\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
