import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import config from "@app/config";
import logger, { formatPrismaQuery } from "@app/shared/logger";
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "info" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

prisma.$on("query", (e) => {
  logger.debug(formatPrismaQuery(e.query, e.params, `${e.duration}ms`));
});

prisma.$on("info", (e) => logger.info(e));
prisma.$on("warn", (e) => logger.warn(e));
prisma.$on("error", (e) => logger.error(e));

// Seed admin user
async function seedAdmin(): Promise<void> {
  try {
    const saltRounds = Number(config.salt_rounds) || 10;
    const adminPassword = await bcrypt.hash("sajukhan", saltRounds);

    await prisma.user.upsert({
      where: { mobile: "01617134236" },
      update: {}, // no updates if exists
      create: {
        name: "Shariful Islam",
        mobile: "01617134236",
        password: adminPassword,
        userType: "ADMIN",
      },
    });

    logger.info("[Seed] Admin user ensured");
  } catch (err) {
    logger.error({ err }, "[Seed Error] Failed to seed admin user");
    process.exit(1);
  }
}

// Run seeding only in dev or explicitly
if (config.env !== "production") {
  seedAdmin();
}

export default prisma;
