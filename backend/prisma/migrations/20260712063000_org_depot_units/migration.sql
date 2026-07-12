-- Replace industry/website with depot, distance unit, currency
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "industryType";
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "websiteUrl";
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "depotName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "distanceUnit" TEXT DEFAULT 'km';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "currencyType" TEXT DEFAULT 'INR';
