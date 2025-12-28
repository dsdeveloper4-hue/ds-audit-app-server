import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetSuperAdminPassword() {
    console.log("Resetting SUPER_ADMIN password...");

    // Check if super admin exists
    const superAdmin = await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" }
    });

    if (!superAdmin) {
        console.log("No SUPER_ADMIN found. Creating one...");
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const newAdmin = await prisma.user.create({
            data: {
                name: "Super Admin",
                email: "admin@digitalseba.com",
                password: hashedPassword,
                role: "SUPER_ADMIN",
                auth_provider: "local",
            }
        });
        console.log("✅ SUPER_ADMIN created!");
        console.log("📧 Email:", newAdmin.email);
        console.log("🔑 Password: admin123");
    } else {
        // Reset password
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await prisma.user.update({
            where: { id: superAdmin.id },
            data: { password: hashedPassword }
        });
        console.log("✅ Password reset successful!");
        console.log("📧 Email:", superAdmin.email);
        console.log("🔑 Password: admin123");
    }

    await prisma.$disconnect();
}

resetSuperAdminPassword().catch(console.error);
