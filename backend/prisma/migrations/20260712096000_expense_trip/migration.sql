-- AlterTable
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "tripId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Expense_tripId_fkey'
  ) THEN
    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Expense_tripId_idx" ON "Expense"("tripId");
