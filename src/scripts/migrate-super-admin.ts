// Script to migrate super admin from phone-based to Gmail-based authentication
import prisma from "../app/lib/prisma";
import { Role } from "@prisma/client";

async function migrateSuperAdmin() {
  console.log("🔄 Starting Super Admin Migration to Gmail Authentication...\n");

  try {
    // Step 1: Find current super admin
    const superAdmin = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });

    if (!superAdmin) {
      console.log("❌ No super admin found in database.");
      return;
    }

    console.log("📋 Current Super Admin Details:");
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Auth Provider: ${superAdmin.auth_provider}`);
    console.log(`   Google ID: ${superAdmin.google_id || "Not set"}\n`);

    // Step 2: Prompt for new Gmail (in production, pass as argument)
    const newGmail = process.argv[2];

    if (!newGmail) {
      console.log("❌ Please provide Gmail address as argument:");
      console.log("   npm run migrate-admin your-admin@gmail.com");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newGmail)) {
      console.log(
        "❌ Invalid email format. Please provide a valid Gmail address."
      );
      return;
    }

    // Step 3: Update super admin
    const updated = await prisma.user.update({
      where: { id: superAdmin.id },
      data: {
        email: newGmail,
        auth_provider: "google",
        password: null, // Remove password, force Google OAuth
      },
    });

    console.log("✅ Super Admin Successfully Migrated!");
    console.log("\n📋 Updated Details:");
    console.log(`   ID: ${updated.id}`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Auth Provider: ${updated.auth_provider}`);
    console.log(`   Password: Removed (Google OAuth only)`);

    console.log("\n🎯 Next Steps:");
    console.log(`   1. Super admin must now login using: ${newGmail}`);
    console.log("   2. Use Google Sign-In button on login page");
    console.log("   3. On first login, Google ID will be automatically set");
    console.log("   4. Phone-based login is no longer available\n");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSuperAdmin();
