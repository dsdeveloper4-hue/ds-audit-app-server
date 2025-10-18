import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Middleware to log recent activity using Prisma v5+ client extensions
const prismaWithMiddleware = prisma.$extends({
  client: {
    $allModels: {
      async create<T extends { data: any; select?: any; include?: any }>(
        this: T,
        args: T
      ) {
        return await logActivity.call(this, "create", args);
      },

      async update<
        T extends { where: any; data?: any; select?: any; include?: any }
      >(this: T, args: T) {
        return await logActivity.call(this, "update", args);
      },

      async delete<T extends { where: any; select?: any; include?: any }>(
        this: T,
        args: T
      ) {
        return await logActivity.call(this, "delete", args);
      },
    },
  },
});

async function logActivity(this: Record<string, any>, action: string, args: any) {
  const model = Object.keys(this)[0]; // Get the model name from the proxy

  // Get before state for update/delete operations
  let before = null;
  if (action === "update" || action === "delete") {
    try {
      before = await (prisma[model as keyof typeof prisma] as any).findUnique({
        where: args.where,
      });
    } catch (error) {
      console.error("Error getting before state:", error);
    }
  }

  // Execute the original operation
  const result = await (prisma[model as keyof typeof prisma] as any)[action](
    args
  );

  // Get after state for create/update operations
  let after = null;
  if (action === "create" || action === "update") {
    after = result;
  }

  // Log the activity if it's a create, update, or delete operation
  if (["create", "update", "delete"].includes(action)) {
    try {
      await prisma.recentActivityHistory.create({
        data: {
          user_id: args.data?.userId || null,
          entity_type: model || "Unknown",
          entity_name: model || "Unknown",
          entity_id: result?.id || args.where?.id || null,
          action_type: action.toUpperCase() as any,
          before: before,
          after: after,
          change_summary: args.data
            ? {
                fields_changed: Object.keys(args.data),
                change_amount: calcDiff(before, after),
              }
            : undefined,
          description: `${action.toUpperCase()} operation on ${model}`,
        },
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  return result;
}

function calcDiff(before: any, after: any) {
  if (!before || !after) return null;
  let diff = 0;
  for (const key in after) {
    if (typeof after[key] === "number" && typeof before[key] === "number") {
      diff += Math.abs(after[key] - before[key]);
    }
  }
  return diff;
}

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

// Export the Prisma client with middleware
export default prismaWithMiddleware;
