-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('BASIC', 'PRO', 'MAX');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'BASIC';
