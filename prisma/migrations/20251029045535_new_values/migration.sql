-- CreateTable
CREATE TABLE "public"."AssetPurchase" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetPurchase_room_id_idx" ON "public"."AssetPurchase"("room_id");

-- CreateIndex
CREATE INDEX "AssetPurchase_item_id_idx" ON "public"."AssetPurchase"("item_id");

-- CreateIndex
CREATE INDEX "AssetPurchase_purchase_date_idx" ON "public"."AssetPurchase"("purchase_date");

-- CreateIndex
CREATE INDEX "AssetPurchase_added_by_idx" ON "public"."AssetPurchase"("added_by");

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetPurchase" ADD CONSTRAINT "AssetPurchase_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
