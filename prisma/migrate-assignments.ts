/**
 * Migration Script: Migrate existing AssetPurchase.assigned_employee_id to EntityAssignment table
 * 
 * Run with: npx ts-node prisma/migrate-assignments.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateAssignments() {
    console.log("🔄 Starting assignment migration...\n");

    // Find all asset purchases with assigned_employee_id that don't have EntityAssignment
    const assetsWithAssignments = await prisma.assetPurchase.findMany({
        where: {
            assigned_employee_id: {
                not: null,
            },
        },
        select: {
            id: true,
            assigned_employee_id: true,
            serial_number: true,
            item: {
                select: { name: true },
            },
        },
    });

    console.log(`📊 Found ${assetsWithAssignments.length} assets with assigned employees`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const asset of assetsWithAssignments) {
        try {
            // Check if assignment already exists
            const existingAssignment = await prisma.entityAssignment.findFirst({
                where: {
                    entity_type: "ASSET_PURCHASE",
                    entity_id: asset.id,
                    employee_id: asset.assigned_employee_id!,
                    unassigned_at: null,
                },
            });

            if (existingAssignment) {
                skipped++;
                continue;
            }

            // Create the EntityAssignment
            await prisma.entityAssignment.create({
                data: {
                    entity_type: "ASSET_PURCHASE",
                    entity_id: asset.id,
                    employee_id: asset.assigned_employee_id!,
                },
            });

            migrated++;
            console.log(`  ✅ Migrated: ${asset.serial_number || asset.id} (${asset.item.name})`);
        } catch (error) {
            errors++;
            console.log(`  ❌ Error migrating ${asset.id}:`, error);
        }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`  - Migrated: ${migrated}`);
    console.log(`  - Skipped (already exists): ${skipped}`);
    console.log(`  - Errors: ${errors}`);
    console.log("\n🎉 Migration complete!");
}

migrateAssignments()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
