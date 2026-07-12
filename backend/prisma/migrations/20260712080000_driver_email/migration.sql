-- AlterTable Driver: add email for license reminders
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "email" TEXT;
