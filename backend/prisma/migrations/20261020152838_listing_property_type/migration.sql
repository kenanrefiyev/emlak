-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "property_type" "PropertyType" NOT NULL DEFAULT 'APARTMENT';
