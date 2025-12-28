// Quick test to see if permission modules can be imported
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing Prisma connection...');
    
    // Test if Permission table exists
    const permissions = await prisma.permission.findMany({ take: 1 });
    console.log('✅ Permission table exists');
    console.log('✅ Found permissions:', permissions.length);
    
    // Test if RolePermission table exists
    const rolePerms = await prisma.rolePermission.findMany({ take: 1 });
    console.log('✅ RolePermission table exists');
    console.log('✅ Found role permissions:', rolePerms.length);
    
    // Test if UserPermission table exists
    const userPerms = await prisma.userPermission.findMany({ take: 1 });
    console.log('✅ UserPermission table exists');
    console.log('✅ Found user permissions:', userPerms.length);
    
    console.log('\n🎉 All permission tables are working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
