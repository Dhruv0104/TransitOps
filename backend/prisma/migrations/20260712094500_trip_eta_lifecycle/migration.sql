-- AlterTable
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "etaMinutes" INTEGER;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Backfill ETA from planned distance (~40 km/h average)
UPDATE "Trip"
SET "etaMinutes" = GREATEST(15, ROUND(("plannedDistance" / 40.0) * 60))
WHERE "etaMinutes" IS NULL;

-- Approximate lifecycle stamps from existing status/timestamps
UPDATE "Trip"
SET "dispatchedAt" = COALESCE("dispatchedAt", "updatedAt")
WHERE status IN ('DISPATCHED', 'COMPLETED') AND "dispatchedAt" IS NULL;

UPDATE "Trip"
SET "completedAt" = COALESCE("completedAt", "updatedAt")
WHERE status = 'COMPLETED' AND "completedAt" IS NULL;

UPDATE "Trip"
SET "cancelledAt" = COALESCE("cancelledAt", "updatedAt")
WHERE status = 'CANCELLED' AND "cancelledAt" IS NULL;
