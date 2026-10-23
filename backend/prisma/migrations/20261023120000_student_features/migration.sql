-- Student features: rental cost fields, owner-reported availability, optional
-- roommate lifestyle answers, saved roommate ads and in-app notifications.
-- Additive only: new nullable columns / defaults and new tables; no data is
-- rewritten or removed. Existing roommate answers keep their values.

-- CreateEnum
CREATE TYPE "ListingAvailability" AS ENUM ('AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'RESERVED');

-- CreateEnum
CREATE TYPE "NoiseLevel" AS ENUM ('QUIET', 'MODERATE', 'LIVELY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INQUIRY_RECEIVED', 'INQUIRY_ACCEPTED', 'INQUIRY_DECLINED', 'SEARCH_MATCH');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "availability" "ListingAvailability" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "availability_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "cost_sharers" INTEGER,
ADD COLUMN     "internet_cost" INTEGER,
ADD COLUMN     "other_costs" INTEGER,
ADD COLUMN     "other_costs_note" TEXT,
ADD COLUMN     "utilities_cost" INTEGER;

-- AlterTable
ALTER TABLE "roommate_ads" ADD COLUMN     "noise" "NoiseLevel",
ADD COLUMN     "show_profile" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "smoking" DROP NOT NULL,
ALTER COLUMN "smoking" DROP DEFAULT,
ALTER COLUMN "cleaning" DROP NOT NULL,
ALTER COLUMN "cleaning" DROP DEFAULT,
ALTER COLUMN "sleep_schedule" DROP NOT NULL,
ALTER COLUMN "sleep_schedule" DROP DEFAULT,
ALTER COLUMN "guests" DROP NOT NULL,
ALTER COLUMN "guests" DROP DEFAULT;

-- CreateTable
CREATE TABLE "saved_roommate_ads" (
    "user_id" TEXT NOT NULL,
    "roommate_ad_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_roommate_ads_pkey" PRIMARY KEY ("user_id","roommate_ad_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB,
    "href" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_roommate_ads_roommate_ad_id_idx" ON "saved_roommate_ads"("roommate_ad_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "saved_roommate_ads" ADD CONSTRAINT "saved_roommate_ads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_roommate_ads" ADD CONSTRAINT "saved_roommate_ads_roommate_ad_id_fkey" FOREIGN KEY ("roommate_ad_id") REFERENCES "roommate_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

