-- Add office_name column to Room table
ALTER TABLE "Room" ADD COLUMN "office_name" TEXT;

-- Create index for office_name for better query performance
CREATE INDEX "Room_office_name_idx" ON "Room"("office_name");
