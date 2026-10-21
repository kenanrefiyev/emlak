-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'OWNER', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('az', 'tr', 'ru', 'en');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MetroLine" AS ENUM ('RED', 'GREEN', 'PURPLE');

-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('PRIVATE_ROOM', 'SHARED_APARTMENT', 'ENTIRE_APARTMENT', 'DORMITORY', 'FAMILY_APARTMENT');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'RENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('FURNISHED', 'PARTLY', 'UNFURNISHED');

-- CreateEnum
CREATE TYPE "UtilitiesMode" AS ENUM ('INCLUDED', 'PARTLY', 'NOT_INCLUDED');

-- CreateEnum
CREATE TYPE "Heating" AS ENUM ('CENTRAL', 'COMBI', 'ELECTRIC', 'NONE');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('ANY', 'FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "ListingEventType" AS ENUM ('VIEW', 'SAVE', 'CONTACT_REQUEST', 'PHONE_REVEAL');

-- CreateEnum
CREATE TYPE "SearchKind" AS ENUM ('LISTINGS', 'ROOMMATES');

-- CreateEnum
CREATE TYPE "RoommateAdType" AS ENUM ('HAS_PLACE', 'SEEKING_PARTNER');

-- CreateEnum
CREATE TYPE "RoommateAdStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SmokingPolicy" AS ENUM ('NO_SMOKING', 'OUTSIDE_ONLY', 'ALLOWED');

-- CreateEnum
CREATE TYPE "CleaningStyle" AS ENUM ('ROTA', 'EACH_OWN', 'HIRED_HELP', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "SleepSchedule" AS ENUM ('EARLY', 'LATE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "GuestsPolicy" AS ENUM ('RARELY', 'SOMETIMES', 'OFTEN');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('IN_APP', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('LISTING', 'ROOMMATE_AD', 'USER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE', 'SCAM', 'WRONG_PRICE', 'ALREADY_RENTED', 'OFFENSIVE', 'DISCRIMINATION', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeaturedSource" AS ENUM ('SUBSCRIPTION', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspended_reason" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "preferred_locale" "Locale" NOT NULL DEFAULT 'az',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "hometown" TEXT,
    "university_id" TEXT,
    "study_year" INTEGER,
    "share_phone_on_accept" BOOLEAN NOT NULL DEFAULT true,
    "avatar_key" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_profiles" (
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "license_number" TEXT,
    "business_phone" TEXT,
    "business_email" TEXT,
    "website" TEXT,
    "about" TEXT,
    "office_address" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NONE',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "document_key" TEXT,
    "reviewer_id" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metro_stations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "line" "MetroLine" NOT NULL,
    "district_id" TEXT,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "metro_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "district_id" TEXT,
    "nearest_metro_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "category" "ListingCategory" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "original_locale" "Locale" NOT NULL DEFAULT 'az',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "monthly_rent" INTEGER NOT NULL,
    "price_per_place" BOOLEAN NOT NULL DEFAULT false,
    "deposit" INTEGER,
    "commission_type" "CommissionType" NOT NULL DEFAULT 'NONE',
    "commission_value" INTEGER,
    "district_id" TEXT NOT NULL,
    "neighborhood_id" TEXT,
    "metro_station_id" TEXT,
    "university_id" TEXT,
    "address_private" TEXT,
    "address_public" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "area_sqm" INTEGER,
    "floor" INTEGER,
    "total_floors" INTEGER,
    "residents_count" INTEGER,
    "available_spaces" INTEGER,
    "furnishing" "Furnishing" NOT NULL DEFAULT 'FURNISHED',
    "utilities" "UtilitiesMode" NOT NULL DEFAULT 'NOT_INCLUDED',
    "internet" BOOLEAN NOT NULL DEFAULT false,
    "heating" "Heating" NOT NULL DEFAULT 'CENTRAL',
    "air_conditioning" BOOLEAN NOT NULL DEFAULT false,
    "gender_preference" "GenderPreference" NOT NULL DEFAULT 'ANY',
    "available_from" DATE NOT NULL,
    "min_duration_months" INTEGER NOT NULL DEFAULT 1,
    "video_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "rented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_translations" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payment_terms" TEXT,
    "is_original" BOOLEAN NOT NULL DEFAULT false,
    "is_machine" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_amenities" (
    "listing_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,

    CONSTRAINT "listing_amenities_pkey" PRIMARY KEY ("listing_id","amenity_id")
);

-- CreateTable
CREATE TABLE "listing_events" (
    "id" BIGSERIAL NOT NULL,
    "listing_id" TEXT NOT NULL,
    "type" "ListingEventType" NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_listings" (
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("user_id","listing_id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "SearchKind" NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roommate_ads" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" "RoommateAdType" NOT NULL,
    "status" "RoommateAdStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "original_locale" "Locale" NOT NULL DEFAULT 'az',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthly_contribution" INTEGER,
    "accommodation_type" "ListingCategory",
    "current_residents" INTEGER,
    "available_spaces" INTEGER,
    "district_id" TEXT,
    "neighborhood_id" TEXT,
    "metro_station_id" TEXT,
    "listing_id" TEXT,
    "house_rules" TEXT,
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "desired_property_type" "ListingCategory",
    "group_size" INTEGER,
    "university_id" TEXT,
    "move_in_date" DATE NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "gender_preference" "GenderPreference" NOT NULL DEFAULT 'ANY',
    "smoking" "SmokingPolicy" NOT NULL DEFAULT 'NO_SMOKING',
    "cleaning" "CleaningStyle" NOT NULL DEFAULT 'ROTA',
    "sleep_schedule" "SleepSchedule" NOT NULL DEFAULT 'FLEXIBLE',
    "guests" "GuestsPolicy" NOT NULL DEFAULT 'SOMETIMES',
    "pets_ok" BOOLEAN NOT NULL DEFAULT false,
    "contact_preference" "ContactPreference" NOT NULL DEFAULT 'IN_APP',
    "submitted_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roommate_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roommate_ad_districts" (
    "roommate_ad_id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,

    CONSTRAINT "roommate_ad_districts_pkey" PRIMARY KEY ("roommate_ad_id","district_id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "roommate_ad_id" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "read_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT,
    "target_type" "ReportTarget" NOT NULL,
    "listing_id" TEXT,
    "roommate_ad_id" TEXT,
    "reported_user_id" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolver_id" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "price_azn" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "listing_limit" INTEGER NOT NULL,
    "featured_slots" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_listings" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "source" "FeaturedSource" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_type_idx" ON "auth_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "rate_limit_hits_key_created_at_idx" ON "rate_limit_hits"("key", "created_at");

-- CreateIndex
CREATE INDEX "agent_profiles_verification_status_idx" ON "agent_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "verification_requests_status_created_at_idx" ON "verification_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_requests_applicant_id_idx" ON "verification_requests"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "districts_slug_key" ON "districts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_slug_key" ON "neighborhoods"("slug");

-- CreateIndex
CREATE INDEX "neighborhoods_district_id_idx" ON "neighborhoods"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "metro_stations_slug_key" ON "metro_stations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");

-- CreateIndex
CREATE INDEX "listings_status_expires_at_published_at_idx" ON "listings"("status", "expires_at", "published_at");

-- CreateIndex
CREATE INDEX "listings_status_category_monthly_rent_idx" ON "listings"("status", "category", "monthly_rent");

-- CreateIndex
CREATE INDEX "listings_district_id_idx" ON "listings"("district_id");

-- CreateIndex
CREATE INDEX "listings_neighborhood_id_idx" ON "listings"("neighborhood_id");

-- CreateIndex
CREATE INDEX "listings_metro_station_id_idx" ON "listings"("metro_station_id");

-- CreateIndex
CREATE INDEX "listings_university_id_idx" ON "listings"("university_id");

-- CreateIndex
CREATE INDEX "listings_owner_id_status_idx" ON "listings"("owner_id", "status");

-- CreateIndex
CREATE INDEX "listings_available_from_idx" ON "listings"("available_from");

-- CreateIndex
CREATE UNIQUE INDEX "listing_translations_listing_id_locale_key" ON "listing_translations"("listing_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "listing_images_storage_key_key" ON "listing_images"("storage_key");

-- CreateIndex
CREATE INDEX "listing_images_listing_id_position_idx" ON "listing_images"("listing_id", "position");

-- CreateIndex
CREATE INDEX "listing_amenities_amenity_id_idx" ON "listing_amenities"("amenity_id");

-- CreateIndex
CREATE INDEX "listing_events_listing_id_type_created_at_idx" ON "listing_events"("listing_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "saved_listings_listing_id_idx" ON "saved_listings"("listing_id");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "roommate_ads_status_expires_at_type_idx" ON "roommate_ads"("status", "expires_at", "type");

-- CreateIndex
CREATE INDEX "roommate_ads_status_monthly_contribution_idx" ON "roommate_ads"("status", "monthly_contribution");

-- CreateIndex
CREATE INDEX "roommate_ads_status_budget_max_idx" ON "roommate_ads"("status", "budget_max");

-- CreateIndex
CREATE INDEX "roommate_ads_district_id_idx" ON "roommate_ads"("district_id");

-- CreateIndex
CREATE INDEX "roommate_ads_university_id_idx" ON "roommate_ads"("university_id");

-- CreateIndex
CREATE INDEX "roommate_ads_owner_id_status_idx" ON "roommate_ads"("owner_id", "status");

-- CreateIndex
CREATE INDEX "roommate_ad_districts_district_id_idx" ON "roommate_ad_districts"("district_id");

-- CreateIndex
CREATE INDEX "contact_requests_recipient_id_status_created_at_idx" ON "contact_requests"("recipient_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "contact_requests_sender_id_created_at_idx" ON "contact_requests"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_packages_code_key" ON "subscription_packages"("code");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "featured_listings_listing_id_ends_at_idx" ON "featured_listings"("listing_id", "ends_at");

-- CreateIndex
CREATE INDEX "featured_listings_ends_at_idx" ON "featured_listings"("ends_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metro_stations" ADD CONSTRAINT "metro_stations_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universities" ADD CONSTRAINT "universities_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universities" ADD CONSTRAINT "universities_nearest_metro_id_fkey" FOREIGN KEY ("nearest_metro_id") REFERENCES "metro_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_metro_station_id_fkey" FOREIGN KEY ("metro_station_id") REFERENCES "metro_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_translations" ADD CONSTRAINT "listing_translations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_metro_station_id_fkey" FOREIGN KEY ("metro_station_id") REFERENCES "metro_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ad_districts" ADD CONSTRAINT "roommate_ad_districts_roommate_ad_id_fkey" FOREIGN KEY ("roommate_ad_id") REFERENCES "roommate_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_ad_districts" ADD CONSTRAINT "roommate_ad_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_roommate_ad_id_fkey" FOREIGN KEY ("roommate_ad_id") REFERENCES "roommate_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_roommate_ad_id_fkey" FOREIGN KEY ("roommate_ad_id") REFERENCES "roommate_ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolver_id_fkey" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "subscription_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
