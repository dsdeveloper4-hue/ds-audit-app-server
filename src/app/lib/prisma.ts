import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("sajukhan", 10);

  const isSuperAdminExists = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
  });

  if (isSuperAdminExists.length > 0) {
    console.log("Super Admin already exists. Skipping creation.");
    return;
  }
  await prisma.user.upsert({
    where: { mobile: "01617134236" },
    update: {},
    create: {
      name: "Shariful Islam",
      mobile: "01617134236",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Super Admin user created successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

export default prisma;
