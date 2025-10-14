import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import config from "@app/config";
import logger from "@app/shared/logger";

const prisma = new PrismaClient();

async function seedSuperAdmin(): Promise<void> {
  try {
    const saltRounds = Number(config.salt_rounds) || 10;

    // Hash the password securely
    const hashedPassword = await bcrypt.hash("sajukhan", saltRounds);

    // Ensure the SuperAdmin role exists
    const superAdminRole = await prisma.role.upsert({
      where: { name: "SuperAdmin" },
      update: {}, // nothing to update if exists
      create: {
        name: "SuperAdmin",
        description: "Super Administrator with full system access",
      },
    });

    // Ensure the SuperAdmin user exists
    const superAdminUser = await prisma.user.upsert({
      where: { mobile: "01617134236" },
      update: {}, // nothing to update if exists
      create: {
        name: "Shariful Islam",
        mobile: "01617134236",
        password: hashedPassword,
        role_id: superAdminRole.id,
      },
    });

    logger.info("[Seed] SuperAdmin user and role ensured successfully");
  } catch (error) {
    logger.error({ error }, "[Seed Error] Failed to seed SuperAdmin user");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding only in dev or when explicitly called
if (config.env !== "production") {
  seedSuperAdmin();
}

export default prisma;
