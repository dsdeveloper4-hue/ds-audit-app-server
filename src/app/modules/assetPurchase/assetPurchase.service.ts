// modules/assetPurchase/assetPurchase.service.ts
import { Request } from "express";
import AppError from "@app/errors/AppError";
import prisma from "@app/lib/prisma";
import httpStatus from "http-status";
import { User } from "@prisma/client";
import { uploadImage } from "@app/lib/cloudinary";

// ---------------- CREATE ASSET PURCHASE ----------------
const createAssetPurchase = async (req: Request): Promise<any> => {
  const user = req.user as User;

  // Parse form data - multer sends everything as strings
  const room_id = req.body.room_id;
  const item_id = req.body.item_id;
  const quantity = Number(req.body.quantity);
  const unit_price = Number(req.body.unit_price);
  const serial_number = req.body.serial_number;
  const purchase_date = req.body.purchase_date;
  const notes = req.body.notes;
  const status = req.body.status || "Active";
  const assigned_by_name = req.body.assigned_by_name;

  console.log("📝 [createAssetPurchase] Received data:");
  console.log("  - status:", status);
  console.log("  - assigned_by_name:", assigned_by_name);
  console.log("  - serial_number:", serial_number);

  if (!room_id || !item_id || !quantity || !unit_price) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Room, item, quantity, and unit price are required"
    );
  }

  if (isNaN(quantity) || quantity <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be a valid number greater than 0"
    );
  }

  if (isNaN(unit_price) || unit_price < 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Unit price must be a valid number and cannot be negative"
    );
  }

  // Verify room exists
  const room = await prisma.room.findUnique({ where: { id: room_id } });
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "Room not found");
  }

  // Verify item exists
  const item = await prisma.item.findUnique({ where: { id: item_id } });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Item not found");
  }

  // Handle image uploads to Cloudinary
  let item_image_url: string | undefined;
  let billing_image_url: string | undefined;

  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Upload images in parallel if they exist
    const uploadPromises: Promise<void>[] = [];

    if (files?.item_image?.[0]) {
      uploadPromises.push(
        uploadImage(files.item_image[0].buffer, "asset-purchases/items").then(
          (result) => {
            item_image_url = result.secure_url;
          }
        )
      );
    }

    if (files?.billing_image?.[0]) {
      uploadPromises.push(
        uploadImage(
          files.billing_image[0].buffer,
          "asset-purchases/billing"
        ).then((result) => {
          billing_image_url = result.secure_url;
        })
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error("Image upload failed:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to upload images: ${error.message}`
    );
  }

  // Calculate total cost
  const total_cost = quantity * unit_price;

  // Update item's unit_price and image_url if needed
  const itemUpdateData: any = {};
  const priceChanged =
    !item.unit_price || Number(item.unit_price) !== unit_price;

  if (priceChanged) {
    itemUpdateData.unit_price = unit_price;
  }

  // Update item's image if a new item image was uploaded
  if (item_image_url) {
    itemUpdateData.image_url = item_image_url;
  }

  if (Object.keys(itemUpdateData).length > 0) {
    await prisma.item.update({
      where: { id: item_id },
      data: itemUpdateData,
    });
    console.log(`✅ Updated item master for ${item.name}:`, itemUpdateData);

    if (priceChanged) {
      console.log(`💰 Price changed: ${item.unit_price} → ${unit_price}`);
      console.log(
        `📝 Note: Each serial number has its own price in ItemDetails`
      );
    }
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Create asset purchase
    const assetPurchase = await tx.assetPurchase.create({
      data: {
        room_id,
        item_id,
        quantity,
        unit_price,
        total_cost,
        serial_number,
        purchase_date: purchase_date ? new Date(purchase_date) : new Date(),
        notes,
        item_image_url,
        billing_image_url,
        status,
        assigned_by_name,
        added_by: user.id,
      },
      include: {
        room: true,
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
    });

    console.log("✅ [createAssetPurchase] Purchase created:");
    console.log("  - id:", assetPurchase.id);
    console.log("  - serial_number:", assetPurchase.serial_number);
    console.log("  - status:", assetPurchase.status);
    console.log("  - assigned_by_name:", assetPurchase.assigned_by_name);

    // Find the latest audit (most recent by year and month)
    const latestAudit = await tx.audit.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
    });

    if (latestAudit) {
      // SERIAL NUMBER BASED LOGIC: Create individual ItemDetails records for each serial number
      // If serial_number is provided, create one record per serial number
      // If no serial_number, create aggregated record (backward compatibility)

      if (serial_number) {
        // Check if this serial number already exists in this audit
        const existingSerial = await tx.itemDetails.findUnique({
          where: {
            serial_audit_unique: {
              item_serial_no: serial_number,
              audit_id: latestAudit.id,
            },
          },
        });

        if (existingSerial) {
          throw new Error(
            `Serial number ${serial_number} already exists in audit ${latestAudit.month}/${latestAudit.year}`
          );
        }

        // Helper function to get status field name
        const getStatusField = (status: string) => {
          switch (status) {
            case "Active":
              return "active_quantity";
            case "Inactive":
              return "inactive_quantity";
            case "Damage":
              return "broken_quantity";
            case "Lost":
              return "lost_quantity";
            default:
              return "active_quantity";
          }
        };

        // Set quantities based on status
        const statusField = getStatusField(status);
        const quantities = {
          active_quantity: 0,
          broken_quantity: 0,
          inactive_quantity: 0,
          lost_quantity: 0,
        };
        quantities[statusField as keyof typeof quantities] = 1;

        console.log(
          `📝 [createAssetPurchase] Setting quantities for status "${status}":`,
          quantities
        );

        // Create individual ItemDetails record for this serial number
        await tx.itemDetails.create({
          data: {
            room_id,
            item_id,
            audit_id: latestAudit.id,
            item_serial_no: serial_number,
            asset_purchase_id: assetPurchase.id,
            ...quantities, // Set quantities based on status
            unit_price: unit_price,
            total_price: unit_price, // For single item, total = unit price
          },
        });

        console.log(
          `✅ Created ItemDetails for serial ${serial_number}: ${item.name} in ${room.name} for audit ${latestAudit.month}/${latestAudit.year}`
        );
      } else {
        // No serial number - use aggregated logic (backward compatibility)
        const existingItemDetail = await tx.itemDetails.findFirst({
          where: {
            room_id,
            item_id,
            audit_id: latestAudit.id,
            item_serial_no: null, // Only match aggregated records
          },
        });

        if (existingItemDetail) {
          // Update existing aggregated ItemDetails
          const newActiveQty = existingItemDetail.active_quantity + quantity;
          const existingTotalPrice =
            Number(existingItemDetail.total_price) || 0;
          const newTotalPrice = existingTotalPrice + total_cost;

          const totalQty =
            newActiveQty +
            existingItemDetail.broken_quantity +
            existingItemDetail.inactive_quantity +
            (existingItemDetail.lost_quantity || 0);

          const newUnitPrice =
            totalQty > 0 ? newTotalPrice / totalQty : unit_price;

          await tx.itemDetails.update({
            where: { id: existingItemDetail.id },
            data: {
              active_quantity: newActiveQty,
              unit_price: newUnitPrice,
              total_price: newTotalPrice,
            },
          });

          console.log(
            `✅ Updated aggregated ItemDetails: Added ${quantity} ${item.name}(s) to ${room.name}`
          );
        } else {
          // Create new aggregated ItemDetails
          await tx.itemDetails.create({
            data: {
              room_id,
              item_id,
              audit_id: latestAudit.id,
              item_serial_no: null,
              asset_purchase_id: assetPurchase.id,
              active_quantity: quantity,
              broken_quantity: 0,
              inactive_quantity: 0,
              lost_quantity: 0,
              unit_price: unit_price,
              total_price: total_cost,
            },
          });

          console.log(
            `✅ Created aggregated ItemDetails: ${quantity} ${item.name}(s) in ${room.name}`
          );
        }
      }

      // Log the audit update in history
      await tx.recentActivityHistory.create({
        data: {
          user_id: user.id,
          entity_type: "ItemDetails",
          entity_name: `${item.name} - ${room.name}`,
          action_type: "UPDATE",
          description: `Added ${quantity} ${item.name}(s) to audit ${latestAudit.month}/${latestAudit.year} as active items (from asset purchase)`,
          metadata: {
            audit_id: latestAudit.id,
            room_id,
            item_id,
            quantity,
            unit_price,
            total_cost,
            source: "asset_purchase",
          },
        },
      });
    } else {
      console.log(
        "⚠️ No audit found. Asset purchase created but not added to any audit."
      );
    }

    // Log asset purchase in history
    await tx.recentActivityHistory.create({
      data: {
        user_id: user.id,
        entity_type: "AssetPurchase",
        entity_id: assetPurchase.id,
        entity_name: `${item.name} - ${room.name}`,
        action_type: "CREATE",
        after: assetPurchase,
        description: `Added ${quantity} ${item.name}(s) to ${
          room.name
        } (Total: ${total_cost})${
          latestAudit
            ? ` - Added to audit ${latestAudit.month}/${latestAudit.year}`
            : ""
        }`,
      },
    });

    return assetPurchase;
  });

  // NOTE: Price changes are NOT propagated globally
  // Each AssetPurchase (serial number) has its own price
  // ItemDetails aggregate multiple purchases, so they calculate weighted average
  // This is correct behavior for inventory management

  return result;
};

// ---------------- GET ALL ASSET PURCHASES ----------------
const getAllAssetPurchases = async (req: Request): Promise<any> => {
  const { room_id, item_id, start_date, end_date } = req.query;

  const where: any = {};

  if (room_id) where.room_id = room_id as string;
  if (item_id) where.item_id = item_id as string;
  if (start_date || end_date) {
    where.purchase_date = {};
    if (start_date) where.purchase_date.gte = new Date(start_date as string);
    if (end_date) where.purchase_date.lte = new Date(end_date as string);
  }

  const purchases = await prisma.assetPurchase.findMany({
    where,
    include: {
      room: true,
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
    orderBy: {
      purchase_date: "desc",
    },
  });

  return purchases;
};

// ---------------- GET ASSET PURCHASE BY ID ----------------
const getAssetPurchaseById = async (id: string): Promise<any> => {
  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: {
      room: true,
      item: true,
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
    },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  return purchase;
};

// ---------------- UPDATE ASSET PURCHASE ----------------
const updateAssetPurchase = async (id: string, req: Request): Promise<any> => {
  const user = req.user as User;

  // Parse form data - multer sends everything as strings
  const room_id = req.body.room_id;
  const item_id = req.body.item_id;
  const quantity = req.body.quantity ? Number(req.body.quantity) : undefined;
  const unit_price = req.body.unit_price
    ? Number(req.body.unit_price)
    : undefined;
  const serial_number = req.body.serial_number;
  const purchase_date = req.body.purchase_date;
  const notes = req.body.notes;
  const assigned_by_name = req.body.assigned_by_name;
  const status = req.body.status;

  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: { room: true, item: true },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  // Verify room if provided
  if (room_id) {
    const room = await prisma.room.findUnique({ where: { id: room_id } });
    if (!room) {
      throw new AppError(httpStatus.NOT_FOUND, "Room not found");
    }
  }

  // Verify item if provided
  if (item_id) {
    const item = await prisma.item.findUnique({ where: { id: item_id } });
    if (!item) {
      throw new AppError(httpStatus.NOT_FOUND, "Item not found");
    }
  }

  // Validate quantity and unit_price
  if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Quantity must be a valid number greater than 0"
    );
  }

  if (unit_price !== undefined && (isNaN(unit_price) || unit_price < 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Unit price must be a valid number and cannot be negative"
    );
  }

  // Handle image uploads to Cloudinary
  let item_image_url: string | undefined = purchase.item_image_url || undefined;
  let billing_image_url: string | undefined =
    purchase.billing_image_url || undefined;

  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Upload images in parallel if they exist
    const uploadPromises: Promise<void>[] = [];

    if (files?.item_image?.[0]) {
      uploadPromises.push(
        uploadImage(files.item_image[0].buffer, "asset-purchases/items").then(
          (result) => {
            item_image_url = result.secure_url;
          }
        )
      );
    }

    if (files?.billing_image?.[0]) {
      uploadPromises.push(
        uploadImage(
          files.billing_image[0].buffer,
          "asset-purchases/billing"
        ).then((result) => {
          billing_image_url = result.secure_url;
        })
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error("Image upload failed:", error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to upload images: ${error.message}`
    );
  }

  // Update item's image if a new item image was uploaded
  if (item_image_url && item_image_url !== purchase.item_image_url) {
    await prisma.item.update({
      where: { id: purchase.item_id },
      data: { image_url: item_image_url },
    });
    console.log(`✅ Updated item image for ${purchase.item.name}`);
  }

  // Calculate new total cost
  const newQuantity = quantity ?? purchase.quantity;
  const newUnitPrice = unit_price ?? Number(purchase.unit_price);
  const total_cost = newQuantity * newUnitPrice;

  const before = { ...purchase };

  // Track if room or status changed for audit sync
  const roomChanged = room_id && room_id !== purchase.room_id;
  const statusChanged = status && status !== purchase.status;
  const oldStatus = purchase.status || "Active";
  const newStatus = status || oldStatus;

  console.log("🔄 [updateAssetPurchase] Change detection:");
  console.log("  - roomChanged:", roomChanged);
  console.log("  - statusChanged:", statusChanged);
  console.log("  - oldStatus:", oldStatus);
  console.log("  - newStatus:", newStatus);
  console.log("  - serial_number:", purchase.serial_number);

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Update the asset purchase
    const updatedPurchase = await tx.assetPurchase.update({
      where: { id },
      data: {
        ...(room_id && { room_id }),
        ...(item_id && { item_id }),
        ...(quantity !== undefined && { quantity }),
        ...(unit_price !== undefined && { unit_price }),
        total_cost,
        ...(serial_number !== undefined && { serial_number }),
        ...(purchase_date && { purchase_date: new Date(purchase_date) }),
        ...(notes !== undefined && { notes }),
        ...(assigned_by_name !== undefined && { assigned_by_name }),
        ...(status !== undefined && { status }),
        item_image_url,
        billing_image_url,
      },
      include: {
        room: true,
        item: true,
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
    });

    // Sync with latest audit if room or status changed
    console.log("🔍 [updateAssetPurchase] Checking sync conditions:");
    console.log("  - Will sync:", roomChanged || statusChanged);

    if (roomChanged || statusChanged) {
      const latestAudit = await tx.audit.findFirst({
        orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
      });

      if (latestAudit) {
        const oldRoomId = purchase.room_id;
        const newRoomId = room_id || purchase.room_id;
        const oldItemId = purchase.item_id;
        const newItemId = item_id || purchase.item_id;
        const oldSerialNumber = purchase.serial_number;
        const newSerialNumber =
          serial_number !== undefined ? serial_number : oldSerialNumber;

        // Helper function to get status field name
        const getStatusField = (status: string) => {
          switch (status) {
            case "Active":
              return "active_quantity";
            case "Inactive":
              return "inactive_quantity";
            case "Damage":
              return "broken_quantity";
            case "Lost":
              return "lost_quantity";
            default:
              return "active_quantity";
          }
        };

        // SERIAL NUMBER BASED LOGIC
        // If this purchase has a serial number, handle it differently
        if (oldSerialNumber || newSerialNumber) {
          console.log(
            `🔍 [updateAssetPurchase] Processing serial: ${oldSerialNumber}`
          );

          // If room changed, update the ItemDetails record with the serial number
          if (roomChanged) {
            // Find the old ItemDetails record by serial number
            const oldItemDetail = await tx.itemDetails.findUnique({
              where: {
                serial_audit_unique: {
                  item_serial_no: oldSerialNumber!,
                  audit_id: latestAudit.id,
                },
              },
            });

            if (oldItemDetail) {
              // Check if serial number is changing
              if (newSerialNumber && newSerialNumber !== oldSerialNumber) {
                // Check if new serial number already exists
                const existingSerial = await tx.itemDetails.findUnique({
                  where: {
                    serial_audit_unique: {
                      item_serial_no: newSerialNumber,
                      audit_id: latestAudit.id,
                    },
                  },
                });

                if (existingSerial) {
                  throw new Error(
                    `Serial number ${newSerialNumber} already exists in audit ${latestAudit.month}/${latestAudit.year}`
                  );
                }
              }

              // Update the ItemDetails record with new room and/or serial number
              await tx.itemDetails.update({
                where: { id: oldItemDetail.id },
                data: {
                  room_id: newRoomId,
                  item_id: newItemId,
                  item_serial_no: newSerialNumber,
                  unit_price: newUnitPrice,
                  total_price: newUnitPrice, // For serial items, total = unit price
                },
              });

              console.log(
                `✅ Updated ItemDetails for serial ${oldSerialNumber} → ${newSerialNumber}: moved to ${updatedPurchase.room.name}`
              );
            }
          }
          // If only status changed (same room)
          else if (statusChanged) {
            const itemDetail = await tx.itemDetails.findUnique({
              where: {
                serial_audit_unique: {
                  item_serial_no: oldSerialNumber!,
                  audit_id: latestAudit.id,
                },
              },
            });

            if (itemDetail) {
              const oldStatusField = getStatusField(oldStatus);
              const newStatusField = getStatusField(newStatus);

              // For serial-tracked items, quantity is always 1
              await tx.itemDetails.update({
                where: { id: itemDetail.id },
                data: {
                  [oldStatusField]: 0,
                  [newStatusField]: 1,
                  unit_price: newUnitPrice,
                  total_price: newUnitPrice,
                },
              });

              console.log(
                `✅ Updated status for serial ${oldSerialNumber}: ${oldStatus} → ${newStatus}`
              );
            }
          }
          // If serial number changed but room didn't
          else if (newSerialNumber && newSerialNumber !== oldSerialNumber) {
            // Check if new serial number already exists
            const existingSerial = await tx.itemDetails.findUnique({
              where: {
                serial_audit_unique: {
                  item_serial_no: newSerialNumber,
                  audit_id: latestAudit.id,
                },
              },
            });

            if (existingSerial) {
              throw new Error(
                `Serial number ${newSerialNumber} already exists in audit ${latestAudit.month}/${latestAudit.year}`
              );
            }

            // Update the serial number
            const itemDetail = await tx.itemDetails.findUnique({
              where: {
                serial_audit_unique: {
                  item_serial_no: oldSerialNumber!,
                  audit_id: latestAudit.id,
                },
              },
            });

            if (itemDetail) {
              await tx.itemDetails.update({
                where: { id: itemDetail.id },
                data: {
                  item_serial_no: newSerialNumber,
                  unit_price: newUnitPrice,
                  total_price: newUnitPrice,
                },
              });

              console.log(
                `✅ Updated serial number: ${oldSerialNumber} → ${newSerialNumber}`
              );
            }
          }

          // DEDICATED STATUS-ONLY SYNC (independent of room changes)
          if (statusChanged && !roomChanged && oldSerialNumber) {
            console.log(
              `🔄 [updateAssetPurchase] Status-only change for serial: ${oldSerialNumber}`
            );

            const itemDetail = await tx.itemDetails.findUnique({
              where: {
                serial_audit_unique: {
                  item_serial_no: oldSerialNumber,
                  audit_id: latestAudit.id,
                },
              },
            });

            if (itemDetail) {
              const oldStatusField = getStatusField(oldStatus);
              const newStatusField = getStatusField(newStatus);

              console.log(
                `🔄 Updating quantities: ${oldStatusField}=0, ${newStatusField}=1`
              );

              await tx.itemDetails.update({
                where: { id: itemDetail.id },
                data: {
                  [oldStatusField]: 0,
                  [newStatusField]: 1,
                  unit_price: newUnitPrice,
                  total_price: newUnitPrice,
                },
              });

              console.log(
                `✅ Status-only update completed for serial ${oldSerialNumber}: ${oldStatus} → ${newStatus}`
              );
            } else {
              console.log(
                `❌ No ItemDetails found for serial: ${oldSerialNumber}`
              );
            }
          }
        }
        // AGGREGATED LOGIC (no serial number)
        else if (roomChanged) {
          // Decrease quantity in old room
          const oldItemDetail = await tx.itemDetails.findFirst({
            where: {
              room_id: oldRoomId,
              item_id: oldItemId,
              audit_id: latestAudit.id,
              item_serial_no: null, // Only match aggregated records
            },
          });

          if (oldItemDetail) {
            const statusField = getStatusField(oldStatus);
            const currentQty = oldItemDetail[
              statusField as keyof typeof oldItemDetail
            ] as number;
            const newQty = Math.max(0, currentQty - purchase.quantity);

            // Recalculate total_price based on new quantities
            const newTotalQty =
              (statusField === "active_quantity"
                ? newQty
                : oldItemDetail.active_quantity) +
              (statusField === "inactive_quantity"
                ? newQty
                : oldItemDetail.inactive_quantity) +
              (statusField === "broken_quantity"
                ? newQty
                : oldItemDetail.broken_quantity) +
              (statusField === "lost_quantity"
                ? newQty
                : oldItemDetail.lost_quantity || 0);

            // Get the LATEST purchase price for this item
            const latestPurchase = await tx.assetPurchase.findFirst({
              where: { item_id: oldItemId },
              orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
              select: { unit_price: true },
            });
            const unitPrice = latestPurchase
              ? Number(latestPurchase.unit_price)
              : Number(oldItemDetail.unit_price) || 0;
            const newTotalPrice = newTotalQty * unitPrice;

            // If all quantities are zero, delete the ItemDetails record
            if (newTotalQty === 0) {
              await tx.itemDetails.delete({
                where: { id: oldItemDetail.id },
              });
              console.log(
                `✅ Deleted ItemDetails from old room ${purchase.room.name} (all quantities = 0)`
              );

              // Log the deletion
              await tx.recentActivityHistory.create({
                data: {
                  user_id: user.id,
                  entity_type: "ItemDetails",
                  entity_id: oldItemDetail.id,
                  entity_name: `${purchase.item.name} - ${purchase.room.name}`,
                  action_type: "DELETE",
                  description: `Removed ${purchase.item.name} from ${purchase.room.name} in audit (all quantities = 0 after room transfer)`,
                  metadata: {
                    audit_id: latestAudit.id,
                    room_id: oldRoomId,
                    item_id: oldItemId,
                    auto_deleted: true,
                    reason: "room_transfer",
                  },
                },
              });
            } else {
              await tx.itemDetails.update({
                where: { id: oldItemDetail.id },
                data: {
                  [statusField]: newQty,
                  total_price: newTotalPrice,
                },
              });

              console.log(
                `✅ Decreased ${statusField} in old room ${purchase.room.name}: ${currentQty} → ${newQty}, total_price: ${newTotalPrice}`
              );
            }
          }

          // Increase quantity in new room
          const newItemDetail = await tx.itemDetails.findFirst({
            where: {
              room_id: newRoomId,
              item_id: newItemId,
              audit_id: latestAudit.id,
              item_serial_no: null, // Only match aggregated records
            },
          });

          const statusField = getStatusField(newStatus);

          if (newItemDetail) {
            const currentQty = newItemDetail[
              statusField as keyof typeof newItemDetail
            ] as number;
            const newQty = currentQty + purchase.quantity;

            // Recalculate total_price based on new quantities
            const newTotalQty =
              (statusField === "active_quantity"
                ? newQty
                : newItemDetail.active_quantity) +
              (statusField === "inactive_quantity"
                ? newQty
                : newItemDetail.inactive_quantity) +
              (statusField === "broken_quantity"
                ? newQty
                : newItemDetail.broken_quantity) +
              (statusField === "lost_quantity"
                ? newQty
                : newItemDetail.lost_quantity || 0);

            // Get the LATEST purchase price for this item
            const latestPurchase = await tx.assetPurchase.findFirst({
              where: { item_id: newItemId },
              orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
              select: { unit_price: true },
            });
            const unitPrice = latestPurchase
              ? Number(latestPurchase.unit_price)
              : Number(newItemDetail.unit_price) || 0;
            const newTotalPrice = newTotalQty * unitPrice;

            await tx.itemDetails.update({
              where: { id: newItemDetail.id },
              data: {
                [statusField]: newQty,
                unit_price: unitPrice,
                total_price: newTotalPrice,
              },
            });

            console.log(
              `✅ Increased ${statusField} in new room ${updatedPurchase.room.name}: ${currentQty} → ${newQty}, total_price: ${newTotalPrice}`
            );
          } else {
            // Create new item detail in new room - use LATEST price
            const latestPurchase = await tx.assetPurchase.findFirst({
              where: { item_id: newItemId },
              orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
              select: { unit_price: true },
            });
            const unitPrice = latestPurchase
              ? Number(latestPurchase.unit_price)
              : Number(purchase.unit_price);
            const totalPrice = unitPrice * purchase.quantity;

            await tx.itemDetails.create({
              data: {
                room_id: newRoomId,
                item_id: newItemId,
                audit_id: latestAudit.id,
                active_quantity: newStatus === "Active" ? purchase.quantity : 0,
                broken_quantity: newStatus === "Damage" ? purchase.quantity : 0,
                inactive_quantity:
                  newStatus === "Inactive" ? purchase.quantity : 0,
                lost_quantity: newStatus === "Lost" ? purchase.quantity : 0,
                unit_price: unitPrice,
                total_price: totalPrice,
              },
            });

            console.log(
              `✅ Created new ItemDetails in ${updatedPurchase.room.name} with ${statusField}: ${purchase.quantity}, price: ${unitPrice}`
            );
          }
        }
        // If only status changed (same room) - aggregated logic
        else if (statusChanged) {
          const itemDetail = await tx.itemDetails.findFirst({
            where: {
              room_id: oldRoomId,
              item_id: oldItemId,
              audit_id: latestAudit.id,
              item_serial_no: null, // Only match aggregated records
            },
          });

          if (itemDetail) {
            const oldStatusField = getStatusField(oldStatus);
            const newStatusField = getStatusField(newStatus);

            const oldQty = itemDetail[
              oldStatusField as keyof typeof itemDetail
            ] as number;
            const newQty = itemDetail[
              newStatusField as keyof typeof itemDetail
            ] as number;

            const updatedOldQty = Math.max(0, oldQty - purchase.quantity);
            const updatedNewQty = newQty + purchase.quantity;

            // Calculate new total quantity and price
            const newTotalQty =
              (oldStatusField === "active_quantity"
                ? updatedOldQty
                : itemDetail.active_quantity) +
              (oldStatusField === "inactive_quantity"
                ? updatedOldQty
                : itemDetail.inactive_quantity) +
              (oldStatusField === "broken_quantity"
                ? updatedOldQty
                : itemDetail.broken_quantity) +
              (oldStatusField === "lost_quantity"
                ? updatedOldQty
                : itemDetail.lost_quantity || 0) +
              (newStatusField === "active_quantity" ? updatedNewQty : 0) +
              (newStatusField === "inactive_quantity" ? updatedNewQty : 0) +
              (newStatusField === "broken_quantity" ? updatedNewQty : 0) +
              (newStatusField === "lost_quantity" ? updatedNewQty : 0);

            // Get the LATEST purchase price for this item
            const latestPurchase = await tx.assetPurchase.findFirst({
              where: { item_id: oldItemId },
              orderBy: [{ created_at: "desc" }, { purchase_date: "desc" }],
              select: { unit_price: true },
            });
            const unitPrice = latestPurchase
              ? Number(latestPurchase.unit_price)
              : Number(itemDetail.unit_price) || 0;
            const newTotalPrice = newTotalQty * unitPrice;

            // If all quantities are zero, delete the record
            if (newTotalQty === 0) {
              await tx.itemDetails.delete({
                where: { id: itemDetail.id },
              });
              console.log(
                `✅ Deleted ItemDetails in ${purchase.room.name} (all quantities = 0 after status change)`
              );

              // Log the deletion
              await tx.recentActivityHistory.create({
                data: {
                  user_id: user.id,
                  entity_type: "ItemDetails",
                  entity_id: itemDetail.id,
                  entity_name: `${purchase.item.name} - ${purchase.room.name}`,
                  action_type: "DELETE",
                  description: `Removed ${purchase.item.name} from ${purchase.room.name} in audit (all quantities = 0 after status change)`,
                  metadata: {
                    audit_id: latestAudit.id,
                    room_id: oldRoomId,
                    item_id: oldItemId,
                    auto_deleted: true,
                    reason: "status_change",
                  },
                },
              });
            } else {
              await tx.itemDetails.update({
                where: { id: itemDetail.id },
                data: {
                  [oldStatusField]: updatedOldQty,
                  [newStatusField]: updatedNewQty,
                  unit_price: unitPrice,
                  total_price: newTotalPrice,
                },
              });

              console.log(
                `✅ Moved quantity from ${oldStatusField} to ${newStatusField} in ${purchase.room.name}, price: ${unitPrice}, total_price: ${newTotalPrice}`
              );
            }
          }
        }
      }
    }

    // Log update in history
    const changes: string[] = [];
    if (room_id && room_id !== purchase.room_id)
      changes.push(`room changed to ${updatedPurchase.room.name}`);
    if (item_id && item_id !== purchase.item_id) changes.push(`item changed`);
    if (quantity && quantity !== purchase.quantity)
      changes.push(`quantity: ${purchase.quantity} → ${quantity}`);
    if (unit_price && unit_price !== Number(purchase.unit_price))
      changes.push(`unit price: ${purchase.unit_price} → ${unit_price}`);
    if (status && status !== purchase.status)
      changes.push(`status: ${purchase.status || "Active"} → ${status}`);
    if (
      assigned_by_name !== undefined &&
      assigned_by_name !== purchase.assigned_by_name
    )
      changes.push(`assigned to: ${assigned_by_name || "unassigned"}`);

    if (changes.length > 0) {
      await tx.recentActivityHistory.create({
        data: {
          user_id: user.id,
          entity_type: "AssetPurchase",
          entity_id: purchase.id,
          entity_name: `${updatedPurchase.item.name} - ${updatedPurchase.room.name}`,
          action_type: "UPDATE",
          before,
          after: updatedPurchase,
          change_summary: { changes },
          description: `Updated asset purchase: ${changes.join(", ")}`,
        },
      });
    }

    return updatedPurchase;
  });

  // If unit_price was updated AND this purchase has a serial number, update ONLY that serial number in audits
  if (unit_price !== undefined && unit_price !== Number(purchase.unit_price)) {
    console.log(
      `💰 Price updated: ${purchase.unit_price} → ${unit_price} for ${purchase.item.name}`
    );

    try {
      // If this purchase has a serial number, update ONLY the matching serial number in ItemDetails
      if (purchase.serial_number) {
        console.log(
          `🔄 Updating audit records for serial number: ${purchase.serial_number}`
        );

        const serialItemDetails = await prisma.itemDetails.findMany({
          where: {
            item_serial_no: purchase.serial_number,
          },
        });

        for (const detail of serialItemDetails) {
          // For serial-tracked items, total_price = unit_price (quantity is always 1)
          await prisma.itemDetails.update({
            where: { id: detail.id },
            data: {
              unit_price,
              total_price: unit_price, // For serial items, total = unit price
            },
          });
        }

        console.log(
          `✅ Serial number price update complete: ${serialItemDetails.length} audit entries updated for serial ${purchase.serial_number}`
        );

        // Log the serial-specific price update
        await prisma.recentActivityHistory.create({
          data: {
            user_id: user.id,
            entity_type: "ItemDetails",
            entity_name: `${purchase.item.name} (Serial: ${purchase.serial_number})`,
            action_type: "UPDATE",
            description: `Price update for serial ${purchase.serial_number}: ${purchase.unit_price} → ${unit_price}. Updated ${serialItemDetails.length} audit entries.`,
            metadata: {
              serial_number: purchase.serial_number,
              old_price: Number(purchase.unit_price),
              new_price: unit_price,
              entries_updated: serialItemDetails.length,
              source: "asset_purchase_update",
            },
          },
        });
      } else {
        // No serial number - this is an aggregated item, don't propagate globally
        console.log(
          `⚠️ No serial number - price update not propagated to other records`
        );
      }
    } catch (error) {
      console.error("❌ Error propagating price:", error);
      // Don't throw - purchase update was successful
    }
  }

  return result;
};

// ---------------- DELETE ASSET PURCHASE ----------------
const deleteAssetPurchase = async (id: string, req: Request): Promise<any> => {
  const user = req.user as User;

  const purchase = await prisma.assetPurchase.findUnique({
    where: { id },
    include: { room: true, item: true },
  });

  if (!purchase) {
    throw new AppError(httpStatus.NOT_FOUND, "Asset purchase not found");
  }

  await prisma.assetPurchase.delete({ where: { id } });

  // Log deletion in history
  await prisma.recentActivityHistory.create({
    data: {
      user_id: user.id,
      entity_type: "AssetPurchase",
      entity_id: purchase.id,
      entity_name: `${purchase.item.name} - ${purchase.room.name}`,
      action_type: "DELETE",
      before: purchase,
      description: `Deleted asset purchase: ${purchase.quantity} ${purchase.item.name}(s) from ${purchase.room.name}`,
    },
  });

  return { message: "Asset purchase deleted successfully" };
};

// ---------------- GET PURCHASE SUMMARY ----------------
const getPurchaseSummary = async (req: Request): Promise<any> => {
  const { start_date, end_date, room_id } = req.query;

  const where: any = {};

  if (room_id) where.room_id = room_id as string;
  if (start_date || end_date) {
    where.purchase_date = {};
    if (start_date) where.purchase_date.gte = new Date(start_date as string);
    if (end_date) where.purchase_date.lte = new Date(end_date as string);
  }

  const purchases = await prisma.assetPurchase.findMany({
    where,
    include: {
      room: true,
      item: true,
    },
  });

  // Group by room and item
  const summary: any = {
    total_purchases: purchases.length,
    total_cost: purchases.reduce((sum, p) => sum + Number(p.total_cost), 0),
    by_room: {} as any,
    by_item: {} as any,
  };

  purchases.forEach((purchase) => {
    const roomName = purchase.room.name;
    const itemName = purchase.item.name;

    // By room
    if (!summary.by_room[roomName]) {
      summary.by_room[roomName] = {
        room_id: purchase.room_id,
        room_name: roomName,
        total_items: 0,
        total_cost: 0,
        items: [],
      };
    }
    summary.by_room[roomName].total_items += purchase.quantity;
    summary.by_room[roomName].total_cost += Number(purchase.total_cost);
    summary.by_room[roomName].items.push({
      item_name: itemName,
      quantity: purchase.quantity,
      unit_price: Number(purchase.unit_price),
      total_cost: Number(purchase.total_cost),
    });

    // By item
    if (!summary.by_item[itemName]) {
      summary.by_item[itemName] = {
        item_id: purchase.item_id,
        item_name: itemName,
        total_quantity: 0,
        total_cost: 0,
        rooms: [],
      };
    }
    summary.by_item[itemName].total_quantity += purchase.quantity;
    summary.by_item[itemName].total_cost += Number(purchase.total_cost);
    summary.by_item[itemName].rooms.push({
      room_name: roomName,
      quantity: purchase.quantity,
      unit_price: Number(purchase.unit_price),
      total_cost: Number(purchase.total_cost),
    });
  });

  summary.by_room = Object.values(summary.by_room);
  summary.by_item = Object.values(summary.by_item);

  return summary;
};

export const assetPurchaseService = {
  createAssetPurchase,
  getAllAssetPurchases,
  getAssetPurchaseById,
  updateAssetPurchase,
  deleteAssetPurchase,
  getPurchaseSummary,
};
