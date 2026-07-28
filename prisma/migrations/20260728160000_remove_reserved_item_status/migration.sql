-- Remove RESERVED from ItemStatus enum
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'SOLD', 'INACTIVE');
ALTER TABLE "items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "items" ALTER COLUMN "status" TYPE "ItemStatus" USING ("status"::text::"ItemStatus");
ALTER TABLE "items" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
DROP TYPE "ItemStatus_old";
