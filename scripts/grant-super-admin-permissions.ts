import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Grant all available permissions to a user
 */
async function grantAllPermissionsToUser(userId: string): Promise<void> {
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  });

  if (allPermissions.length === 0) {
    console.log(
      "⚠️  No permissions found in database. Run seed-permissions first!"
    );
    return;
  }

  const userPermissions = allPermissions.map((permission) => ({
    user_id: userId,
    permission_id: permission.id,
    granted: true,
  }));

  await prisma.userPermission.createMany({
    data: userPermissions,
    skipDuplicates: true,
  });

  console.log(
    `✅ Granted ${allPermissions.length} permissions to user ${userId}`
  );
}

/**
 * Grant all permissions to all existing SUPER_ADMIN users
 */
async function grantPermissionsToAllSuperAdmins(): Promise<void> {
  console.log("🔍 Finding all SUPER_ADMIN users...");

  const superAdmins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN },
    select: { id: true, name: true, email: true },
  });

  if (superAdmins.length === 0) {
    console.log("⚠️  No SUPER_ADMIN users found.");
    return;
  }

  console.log(`📋 Found ${superAdmins.length} SUPER_ADMIN user(s):`);
  superAdmins.forEach((admin) => {
    console.log(`   - ${admin.name} (${admin.email})`);
  });

  for (const admin of superAdmins) {
    console.log(`\n🔐 Granting permissions to ${admin.name}...`);
    await grantAllPermissionsToUser(admin.id);
  }

  console.log("\n🎉 All SUPER_ADMIN users now have full permissions!");
}

/**
 * Create a new SUPER_ADMIN user with all permissions
 */
async function createSuperAdmin(
  name: string,
  email: string,
  password: string
): Promise<void> {
  console.log(`\n👤 Creating SUPER_ADMIN user: ${name} (${email})`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`⚠️  User with email ${email} already exists!`);
    console.log(`   Updating role to SUPER_ADMIN and granting permissions...`);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: Role.SUPER_ADMIN },
    });

    await grantAllPermissionsToUser(existingUser.id);
    console.log(
      `✅ Updated existing user to SUPER_ADMIN with all permissions!`
    );
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      auth_provider: "local",
    },
  });

  console.log(`✅ Created SUPER_ADMIN user: ${user.name}`);

  // Grant all permissions
  await grantAllPermissionsToUser(user.id);

  console.log(`🎉 SUPER_ADMIN created successfully with all permissions!`);
  console.log(`\n📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`\n⚠️  Please change the password after first login!`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === "grant-all") {
      // Grant permissions to all existing super admins
      await grantPermissionsToAllSuperAdmins();
    } else if (command === "create") {
      // Create new super admin
      const name = args[1];
      const email = args[2];
      const password = args[3];

      if (!name || !email || !password) {
        console.log(
          "❌ Usage: npm run grant-super-admin create <name> <email> <password>"
        );
        console.log(
          '   Example: npm run grant-super-admin create "Admin User" admin@example.com SecurePass123'
        );
        process.exit(1);
      }

      await createSuperAdmin(name, email, password);
    } else {
      console.log("📖 Super Admin Permission Management");
      console.log("\nUsage:");
      console.log("  npm run grant-super-admin grant-all");
      console.log("    → Grant all permissions to existing SUPER_ADMIN users");
      console.log("");
      console.log(
        "  npm run grant-super-admin create <name> <email> <password>"
      );
      console.log("    → Create new SUPER_ADMIN with all permissions");
      console.log(
        '    Example: npm run grant-super-admin create "Admin User" admin@example.com SecurePass123'
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
