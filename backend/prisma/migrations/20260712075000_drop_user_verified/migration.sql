-- Remove unused User.verified column
ALTER TABLE "User" DROP COLUMN IF EXISTS "verified";
