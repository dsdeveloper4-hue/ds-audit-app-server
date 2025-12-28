import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Define all permissions
const defaultPermissions = [
  // Dashboard
  {
    name: "view_dashboard",
    description: "View dashboard",
    category: "dashboard",
  },

  // Audits
  { name: "view_audits", description: "View audits list", category: "audit" },
  { name: "create_audit", description: "Create new audit", category: "audit" },
  { name: "edit_audit", description: "Edit existing audit", category: "audit" },
  { name: "delete_audit", description: "Delete audit", category: "audit" },
  {
    name: "manage_audit_items",
    description: "Manage items in audit",
    category: "audit",
  },

  // Items
  { name: "view_items", description: "View items list", category: "item" },
  { name: "create_item", description: "Create new item", category: "item" },
  { name: "edit_item", description: "Edit existing item", category: "item" },
  { name: "delete_item", description: "Delete item", category: "item" },

  // Rooms
  { name: "view_rooms", description: "View rooms list", category: "room" },
  { name: "create_room", description: "Create new room", category: "room" },
  { name: "edit_room", description: "Edit existing room", category: "room" },
  { name: "delete_room", description: "Delete room", category: "room" },

  // Asset Purchases
  {
    name: "view_asset_purchases",
    description: "View asset purchases",
    category: "asset",
  },
  {
    name: "create_asset_purchase",
    description: "Add new asset purchase",
    category: "asset",
  },
  {
    name: "edit_asset_purchase",
    description: "Edit asset purchase",
    category: "asset",
  },
  {
    name: "delete_asset_purchase",
    description: "Delete asset purchase",
    category: "asset",
  },

  // Reports
  {
    name: "view_item_report",
    description: "View item report",
    category: "report",
  },
  {
    name: "view_monthly_report",
    description: "View monthly report",
    category: "report",
  },
  {
    name: "view_adjusted_report",
    description: "View adjusted total report",
    category: "report",
  },
  {
    name: "export_reports",
    description: "Export reports to CSV",
    category: "report",
  },

  // Users
  { name: "view_users", description: "View users list", category: "user" },
  { name: "create_user", description: "Create new user", category: "user" },
  { name: "edit_user", description: "Edit existing user", category: "user" },
  { name: "delete_user", description: "Delete user", category: "user" },
  {
    name: "manage_permissions",
    description: "Manage user permissions",
    category: "user",
  },

  // Activity History
  {
    name: "view_activity_history",
    description: "View activity history",
    category: "history",
  },
];

async function main() {
  console.log("🌱 Starting Super Admin setup...\n");

  // Step 1: Create all permissions
  console.log("📋 Creating permissions...");
  for (const permission of defaultPermissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        category: permission.category,
      },
      create: permission,
    });
  }
  console.log(`✅ Created ${defaultPermissions.length} permissions\n`);

  // Step 2: Check if Super Admin already exists
  const isSuperAdminExists = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
  });

  if (isSuperAdminExists.length > 0) {
    console.log("⚠️  Super Admin already exists. Skipping creation.");
    return;
  }

  // Step 3: Create Super Admin user
  console.log("👤 Creating Super Admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@digitalseba.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      auth_provider: "local",
    },
  });

  console.log("✅ Super Admin user created successfully!");
  console.log("📧 Email: admin@digitalseba.com");
  console.log("🔑 Password: admin123");
  console.log("👤 Name: Super Admin\n");

  // Step 4: Grant all permissions to Super Admin
  console.log("🔐 Granting all permissions to Super Admin...");

  // Fetch all permissions
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  });

  // Create UserPermission records for each permission
  const userPermissions = allPermissions.map((permission) => ({
    user_id: superAdmin.id,
    permission_id: permission.id,
    granted: true,
  }));

  // Bulk create all permissions for the super admin
  await prisma.userPermission.createMany({
    data: userPermissions,
    skipDuplicates: true,
  });

  console.log(`✅ Granted ${allPermissions.length} permissions to Super Admin`);
  console.log("\n🎉 Super Admin setup complete with full permissions!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

// Export the Prisma client with middleware
export default prisma;
