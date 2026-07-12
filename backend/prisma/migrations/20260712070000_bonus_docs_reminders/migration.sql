-- AlterTable Driver
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "lastLicenseReminderAt" TIMESTAMP(3);

-- CreateTable VehicleDocument
CREATE TABLE IF NOT EXISTS "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VehicleDocument_vehicleId_fkey'
  ) THEN
    ALTER TABLE "VehicleDocument"
      ADD CONSTRAINT "VehicleDocument_vehicleId_fkey"
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
