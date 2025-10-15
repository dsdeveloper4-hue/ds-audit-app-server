import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("yourStrongPassword123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { mobile: "01617134236" },
    update: {},
    create: {
      name: "Shariful Islam",
      mobile: "01617134236",
      password: hashedPassword,
      // role field removed because it's not in schema
    },
  });

  console.log("✅ Super Admin created successfully:", superAdmin);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

export default prisma;
