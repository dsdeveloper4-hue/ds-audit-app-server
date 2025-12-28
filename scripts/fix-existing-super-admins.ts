import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * This script fixes existing SUPER_ADMIN users by granting them all permissions
 * Run this once after deploying the new permission system
 */
async function fixExistingSuperAdmins() {
  console.log("🔧 Fixing existing SUPER_ADMIN users...\n");

  // Step 1: Ensure permissions exist
  const permissionCount = await prisma.permission.count();
  if (permissionCount === 0) {
    console.log("❌ No permissions found in database!");
    console.log("   Please run: npm run seed-permissions");
    process.exit(1);
  }
  console.log(`✅ Found ${permissionCount} permissions in database\n`);

  // Step 2: Find all SUPER_ADMIN users
  const superAdmins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN },
    include: {
      userPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (superAdmins.length === 0) {
    console.log("⚠️  No SUPER_ADMIN users found in database");
    console.log(
      "   Create one using: npm run grant-super-admin create <name> <email> <password>"
    );
    process.exit(0);
  }

  console.log(`📋 Found ${superAdmins.length} SUPER_ADMIN user(s):\n`);

  // Step 3: Process each super admin
  for (const admin of superAdmins) {
    console.log(`👤 ${admin.name} (${admin.email})`);
    console.log(
      `   Current permissions: ${admin.userPermissions.length}/${permissionCount}`
    );

    if (admin.userPermissions.length === permissionCount) {
      console.log(`   ✅ Already has all permissions - skipping\n`);
      continue;
    }

    // Get all permissions
    const allPermissions = await prisma.permission.findMany({
      select: { id: true, name: true },
    });

    // Create missing permissions
    const userPermissions = allPermissions.map((permission) => ({
      user_id: admin.id,
      permission_id: permission.id,
      granted: true,
    }));

    await prisma.userPermission.createMany({
      data: userPermissions,
      skipDuplicates: true,
    });

    // Verify
    const updatedCount = await prisma.userPermission.count({
      where: { user_id: admin.id },
    });

    console.log(
      `   ✅ Updated to ${updatedCount}/${permissionCount} permissions\n`
    );
  }

  console.log("🎉 All SUPER_ADMIN users have been fixed!");
  console.log("\n📊 Summary:");
  console.log(`   Total SUPER_ADMIN users: ${superAdmins.length}`);
  console.log(`   Total permissions: ${permissionCount}`);
  console.log(`   Status: All super admins now have full access`);
}

fixExistingSuperAdmins()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
