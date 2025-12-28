// Seed script to populate permissions and role permissions
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log("🌱 Starting permission seeding...\n");

  // Define all permissions
  const permissions = [
    // Dashboard
    {
      name: "view_dashboard",
      description: "View dashboard",
      category: "dashboard",
    },

    // Audits
    { name: "view_audits", description: "View audits", category: "audit" },
    {
      name: "create_audit",
      description: "Create new audit",
      category: "audit",
    },
    { name: "edit_audit", description: "Edit audit", category: "audit" },
    { name: "delete_audit", description: "Delete audit", category: "audit" },
    {
      name: "complete_audit",
      description: "Complete audit",
      category: "audit",
    },

    // Items
    { name: "view_items", description: "View items", category: "item" },
    { name: "create_item", description: "Create new item", category: "item" },
    { name: "edit_item", description: "Edit item", category: "item" },
    { name: "delete_item", description: "Delete item", category: "item" },

    // Rooms
    { name: "view_rooms", description: "View rooms", category: "room" },
    { name: "create_room", description: "Create new room", category: "room" },
    { name: "edit_room", description: "Edit room", category: "room" },
    { name: "delete_room", description: "Delete room", category: "room" },

    // Users
    { name: "view_users", description: "View users", category: "user" },
    { name: "create_user", description: "Create new user", category: "user" },
    { name: "edit_user", description: "Edit user", category: "user" },
    { name: "delete_user", description: "Delete user", category: "user" },
    {
      name: "manage_permissions",
      description: "Manage user permissions",
      category: "user",
    },

    // Asset Purchases
    {
      name: "view_asset_purchases",
      description: "View asset purchases",
      category: "asset",
    },
    {
      name: "create_asset_purchase",
      description: "Create asset purchase",
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
    { name: "view_reports", description: "View reports", category: "report" },
    {
      name: "export_reports",
      description: "Export reports",
      category: "report",
    },

    // History
    {
      name: "view_history",
      description: "View activity history",
      category: "history",
    },
  ];

  // Create permissions
  console.log("📝 Creating permissions...");
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions\n`);

  // Get all permission IDs
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // Define role permissions
  const rolePermissions = {
    [Role.SUPER_ADMIN]: allPermissions.map((p) => p.id), // All permissions

    [Role.ADMIN]: [
      // Dashboard
      "view_dashboard",
      // Audits
      "view_audits",
      "create_audit",
      "edit_audit",
      "complete_audit",
      // Items
      "view_items",
      "create_item",
      "edit_item",
      // Rooms
      "view_rooms",
      "create_room",
      "edit_room",
      // Users (limited)
      "view_users",
      "create_user",
      "edit_user",
      // Asset Purchases
      "view_asset_purchases",
      "create_asset_purchase",
      "edit_asset_purchase",
      // Reports
      "view_reports",
      "export_reports",
      // History
      "view_history",
    ]
      .map((name) => permissionMap.get(name)!)
      .filter(Boolean),

    [Role.USER]: [
      // Dashboard
      "view_dashboard",
      // Audits
      "view_audits",
      // Items
      "view_items",
      // Rooms
      "view_rooms",
      // Asset Purchases
      "view_asset_purchases",
      // Reports
      "view_reports",
    ]
      .map((name) => permissionMap.get(name)!)
      .filter(Boolean),
  };

  // Create role permissions
  console.log("🔐 Assigning permissions to roles...");
  for (const [role, permissionIds] of Object.entries(rolePermissions)) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission_id: {
            role: role as Role,
            permission_id: permissionId,
          },
        },
        update: {},
        create: {
          role: role as Role,
          permission_id: permissionId,
        },
      });
    }
    console.log(`✅ ${role}: ${permissionIds.length} permissions`);
  }

  console.log("\n🎉 Permission seeding completed successfully!");
}

async function main() {
  try {
    await seedPermissions();
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
