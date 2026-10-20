-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'VIEWING_SCHEDULED', 'COMPLETED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingEventType" ADD VALUE 'IMPRESSION';
ALTER TYPE "ListingEventType" ADD VALUE 'WHATSAPP_CLICK';

-- AlterTable
ALTER TABLE "contact_requests" ADD COLUMN     "lead_status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "lead_updated_at" TIMESTAMP(3),
ADD COLUMN     "owner_note" TEXT,
ADD COLUMN     "viewing_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "listing_translations" ADD COLUMN     "rules" TEXT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "contact_preference" "ContactPreference" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN     "contact_whatsapp" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "contact_requests_recipient_id_lead_status_idx" ON "contact_requests"("recipient_id", "lead_status");

-- Backfill: requests already answered start further along the pipeline.
UPDATE "contact_requests" SET "lead_status" = 'CONTACTED' WHERE "status" = 'ACCEPTED';
UPDATE "contact_requests" SET "lead_status" = 'CLOSED' WHERE "status" = 'DECLINED';
