-- Fix existing users before migration
-- This script updates users who have mobile numbers but no email

-- Update users: set email to their mobile number temporarily
UPDATE "User" 
SET email = mobile 
WHERE email IS NULL AND mobile IS NOT NULL;

-- For any users with NULL email and NULL mobile, set a placeholder
UPDATE "User" 
SET email = CONCAT('user_', id, '@placeholder.local')
WHERE email IS NULL;

-- Verify
SELECT id, name, email, mobile, role FROM "User";
