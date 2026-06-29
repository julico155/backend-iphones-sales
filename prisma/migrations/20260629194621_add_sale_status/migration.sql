-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'ACTIVE';
