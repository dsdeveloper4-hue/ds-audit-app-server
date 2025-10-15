import config from '../config';
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Define permissions
  const permissions = [
    // User permissions
    { resource: "user", action: "create", name: "user:create" },
    { resource: "user", action: "read", name: "user:read" },
    { resource: "user", action: "update", name: "user:update" },
    { resource: "user", action: "delete", name: "user:delete" },
    // Audit permissions
    { resource: "audit", action: "create", name: "audit:create" },
    { resource: "audit", action: "read", name: "audit:read" },
    { resource: "audit", action: "update", name: "audit:update" },
    { resource: "audit", action: "delete", name: "audit:delete" },
    // Room permissions
    { resource: "room", action: "create", name: "room:create" },
    { resource: "room", action: "read", name: "room:read" },
    { resource: "room", action: "update", name: "room:update" },
    { resource: "room", action: "delete", name: "room:delete" },
    // Item permissions
    { resource: "item", action: "create", name: "item:create" },
    { resource: "item", action: "read", name: "item:read" },
    { resource: "item", action: "update", name: "item:update" },
    { resource: "item", action: "delete", name: "item:delete" },
    // Role permissions
    { resource: "role", action: "create", name: "role:create" },
    { resource: "role", action: "read", name: "role:read" },
    { resource: "role", action: "update", name: "role:update" },
    { resource: "role", action: "delete", name: "role:delete" },
    // Permission permissions
    { resource: "permission", action: "create", name: "permission:create" },
    { resource: "permission", action: "read", name: "permission:read" },
    { resource: "permission", action: "update", name: "permission:update" },
    { resource: "permission", action: "delete", name: "permission:delete" },
  ];

  console.log("Creating permissions...");
  // Create permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // Create roles
  console.log("Creating roles...");

  // Admin role with all permissions
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrator with full access",
    },
  });

  // Manager role with read/update permissions
  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: {
      name: "MANAGER",
      description: "Manager with audit and view permissions",
    },
  });

  // Auditor role with audit permissions only
  const auditorRole = await prisma.role.upsert({
    where: { name: "AUDITOR" },
    update: {},
    create: {
      name: "AUDITOR",
      description: "Auditor who can perform audits",
    },
  });

  // Viewer role with read-only permissions
  const viewerRole = await prisma.role.upsert({
    where: { name: "VIEWER" },
    update: {},
    create: {
      name: "VIEWER",
      description: "View-only access",
    },
  });

  console.log("✅ Created roles");

  // Assign permissions to Admin role (all permissions)
  console.log("Assigning permissions to ADMIN role...");
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`✅ Assigned ${allPermissions.length} permissions to ADMIN`);

  // Assign permissions to Manager role (read/update permissions)
  console.log("Assigning permissions to MANAGER role...");
  const managerPermissions = await prisma.permission.findMany({
    where: {
      action: { in: ["read", "update", "create"] },
    },
  });
  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: managerRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: managerRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`✅ Assigned ${managerPermissions.length} permissions to MANAGER`);

  // Assign permissions to Auditor role (audit permissions)
  console.log("Assigning permissions to AUDITOR role...");
  const auditorPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: "audit", action: { in: ["read", "update", "create"] } },
        { resource: "room", action: "read" },
        { resource: "item", action: "read" },
      ],
    },
  });
  for (const permission of auditorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: auditorRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: auditorRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`✅ Assigned ${auditorPermissions.length} permissions to AUDITOR`);

  // Assign permissions to Viewer role (read-only)
  console.log("Assigning permissions to VIEWER role...");
  const viewerPermissions = await prisma.permission.findMany({
    where: {
      action: "read",
    },
  });
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: viewerRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: viewerRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`✅ Assigned ${viewerPermissions.length} permissions to VIEWER`);

  // Create default admin user
  console.log("Creating default admin user...");
  const hashedPassword = await bcrypt.hash("sajukhan", Number(config.salt_rounds));
  await prisma.user.upsert({
    where: { mobile: "01617134236" },
    update: {},
    create: {
      name: "Shariful Islam Saju",
      mobile: "01617134236",
      password: hashedPassword,
      role_id: adminRole.id,
    },
  });
  console.log("✅ Created default admin user (mobile: 01617134236, password: sajukhan)");
  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
