import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

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

  {
    name: "view_employees",
    description: "View employee list and details",
    category: "employee",
  },
  {
    name: "create_employee",
    description: "Create new employees",
    category: "employee",
  },
  {
    name: "update_employee",
    description: "Edit employee information",
    category: "employee",
  },
  {
    name: "delete_employee",
    description: "Deactivate employees",
    category: "employee",
  },

  // Assignments
  {
    name: "view_assignments",
    description: "View employee assignments",
    category: "assignment",
  },
  {
    name: "manage_assignments",
    description: "Assign/unassign employees to entities",
    category: "assignment",
  },
];

// Role-based default permissions
const rolePermissions = {
  SUPER_ADMIN: [
    // Super Admin has ALL permissions
    ...defaultPermissions.map((p) => p.name),
  ],
  ADMIN: [
    // Admin has most permissions including user management
    "view_dashboard",
    "view_audits",
    "create_audit",
    "edit_audit",
    "delete_audit",
    "manage_audit_items",
    "view_items",
    "create_item",
    "edit_item",
    "delete_item",
    "view_rooms",
    "create_room",
    "edit_room",
    "delete_room",
    "view_asset_purchases",
    "create_asset_purchase",
    "edit_asset_purchase",
    "delete_asset_purchase",
    "view_item_report",
    "view_monthly_report",
    "view_adjusted_report",
    "export_reports",
    "view_users",
    "create_user",
    "edit_user",
    "delete_user",
    "manage_permissions",
    "view_activity_history",
    "view_employees",
    "create_employee",
    "update_employee",
    "delete_employee",
    "view_assignments",
    "manage_assignments",
  ],
  EDITOR: [
    // Editor can create/edit but CANNOT delete or manage users
    // Dashboard
    "view_dashboard",
    // Audits - can create/edit but NOT delete
    "view_audits",
    "create_audit",
    "edit_audit",
    "manage_audit_items",
    // Items - can create/edit but NOT delete
    "view_items",
    "create_item",
    "edit_item",
    // Rooms - can create/edit but NOT delete
    "view_rooms",
    "create_room",
    "edit_room",
    // Asset Purchases - can create/edit but NOT delete
    "view_asset_purchases",
    "create_asset_purchase",
    "edit_asset_purchase",
    // Reports - can view and export
    "view_item_report",
    "view_monthly_report",
    "view_adjusted_report",
    "export_reports",
    // History
    "view_activity_history",
    // Employees - read-only
    "view_employees",
    // Assignments - can view only
    "view_assignments",
    // NO user permissions - EDITOR cannot manage users at all
  ],
  USER: [
    // Regular user has view-only permissions
    "view_dashboard",
    "view_audits",
    "view_items",
    "view_rooms",
    "view_asset_purchases",
    "view_item_report",
    "view_monthly_report",
    "view_adjusted_report",
    "view_activity_history",
    "view_assignments",
  ],
};

async function seedPermissions() {
  console.log("🌱 Seeding permissions...");

  // Create all permissions
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

  console.log(`✅ Created ${defaultPermissions.length} permissions`);

  // Assign permissions to roles
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = roleName as Role;

    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            role_permission_id: {
              role,
              permission_id: permission.id,
            },
          },
          update: {},
          create: {
            role,
            permission_id: permission.id,
          },
        });
      }
    }

    console.log(`✅ Assigned ${permissionNames.length} permissions to ${role}`);
  }

  console.log("🎉 Permission seeding completed!");
}

seedPermissions()
  .catch((e) => {
    console.error("❌ Error seeding permissions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
