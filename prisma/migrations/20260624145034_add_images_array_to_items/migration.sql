-- AlterTable
ALTER TABLE "items" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
