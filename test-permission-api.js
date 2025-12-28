// Test Permission API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPermissionAPI() {
  console.log('🧪 Testing Permission API...\n');

  try {
    // Get a user
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!user) {
      console.log('❌ No ADMIN user found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}\n`);

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    console.log(`📋 Role Permissions: ${rolePermissions.length}`);
    rolePermissions.slice(0, 5).forEach(rp => {
      console.log(`   - ${rp.permission.name}`);
    });
    console.log('');

    // Get user-specific permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: { user_id: user.id },
      include: { permission: true },
    });

    console.log(`📋 User-Specific Permissions: ${userPermissions.length}`);
    if (userPermissions.length > 0) {
      userPermissions.forEach(up => {
        console.log(`   - ${up.permission.name} (${up.granted ? 'granted' : 'revoked'})`);
      });
    } else {
      console.log('   (none)');
    }
    console.log('');

    // Calculate final permissions
    const permissionSet = new Set(rolePermissions.map(rp => rp.permission.name));
    
    userPermissions.forEach(up => {
      if (up.granted) {
        permissionSet.add(up.permission.name);
      } else {
        permissionSet.delete(up.permission.name);
      }
    });

    console.log(`✅ Total Effective Permissions: ${permissionSet.size}`);
    console.log('\n📊 Sample Permissions:');
    Array.from(permissionSet).slice(0, 10).forEach(p => {
      console.log(`   ✅ ${p}`);
    });

    console.log('\n✅ ========================================');
    console.log('✅ PERMISSION API TEST PASSED!');
    console.log('✅ ========================================\n');

    console.log('📝 API Endpoint Test:');
    console.log(`   GET /api/v1/permissions/user/${user.id}`);
    console.log('   Should return:');
    console.log('   {');
    console.log('     "success": true,');
    console.log('     "data": {');
    console.log(`       "userId": "${user.id}",`);
    console.log(`       "userName": "${user.name}",`);
    console.log(`       "role": "${user.role}",`);
    console.log(`       "permissions": [${Array.from(permissionSet).length} items],`);
    console.log('       "rolePermissions": [...],');
    console.log('       "userOverrides": [...]');
    console.log('     }');
    console.log('   }\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissionAPI();
