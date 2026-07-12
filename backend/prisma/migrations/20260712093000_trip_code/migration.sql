-- AlterTable
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "tripCode" TEXT;

-- Backfill existing trips
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Trip"
  WHERE "tripCode" IS NULL
)
UPDATE "Trip" AS t
SET "tripCode" = 'TRP' || LPAD(n.rn::text, 3, '0')
FROM numbered AS n
WHERE t.id = n.id;

-- Ensure uniqueness for any remaining nulls (safety)
UPDATE "Trip"
SET "tripCode" = 'TRP' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)
WHERE "tripCode" IS NULL;

ALTER TABLE "Trip" ALTER COLUMN "tripCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Trip_tripCode_key" ON "Trip"("tripCode");
