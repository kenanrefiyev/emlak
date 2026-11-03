-- Countries and cities (markets: Azerbaijan, Türkiye). Every existing
-- district, metro station, university and roommate ad was in Baku, so they are
-- attached to Baku before the new columns become required. No rows are deleted
-- or rewritten. Reference rows mirror backend/prisma/reference-data.ts and
-- skip slugs/codes that already exist.

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");
CREATE INDEX "cities_country_id_sort_order_idx" ON "cities"("country_id", "sort_order");
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reference data
INSERT INTO "countries" ("id", "code", "name_az", "name_tr", "name_ru", "name_en", "currency", "sort_order", "latitude", "longitude") VALUES
    ('country_az', 'az', 'Azərbaycan', 'Azerbaycan', 'Азербайджан', 'Azerbaijan', 'AZN', 1, 40.4093, 49.8671),
    ('country_tr', 'tr', 'Türkiyə', 'Türkiye', 'Турция', 'Turkey', 'TRY', 2, 39, 35)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "cities" ("id", "slug", "country_id", "name_az", "name_tr", "name_ru", "name_en", "is_popular", "sort_order", "latitude", "longitude")
SELECT v.id, v.slug, c."id", v.az, v.tr, v.ru, v.en, true, v.sort, v.lat, v.lng
FROM (VALUES
    ('city_baku', 'baku', 'az', 'Bakı', 'Bakü', 'Баку', 'Baku', 1, 40.4093, 49.8671),
    ('city_sumqayit', 'sumqayit', 'az', 'Sumqayıt', 'Sumgayıt', 'Сумгаит', 'Sumgait', 2, 40.5897, 49.6686),
    ('city_ganja', 'ganja', 'az', 'Gəncə', 'Gence', 'Гянджа', 'Ganja', 3, 40.6828, 46.3606),
    ('city_istanbul', 'istanbul', 'tr', 'İstanbul', 'İstanbul', 'Стамбул', 'Istanbul', 1, 41.0082, 28.9784),
    ('city_ankara', 'ankara', 'tr', 'Ankara', 'Ankara', 'Анкара', 'Ankara', 2, 39.9334, 32.8597),
    ('city_izmir', 'izmir', 'tr', 'İzmir', 'İzmir', 'Измир', 'Izmir', 3, 38.4237, 27.1428),
    ('city_antalya', 'antalya', 'tr', 'Antalya', 'Antalya', 'Анталья', 'Antalya', 4, 36.8969, 30.7133),
    ('city_bursa', 'bursa', 'tr', 'Bursa', 'Bursa', 'Бурса', 'Bursa', 5, 40.1885, 29.061),
    ('city_eskisehir', 'eskisehir', 'tr', 'Eskişehir', 'Eskişehir', 'Эскишехир', 'Eskisehir', 6, 39.7767, 30.5206)
) AS v(id, slug, country, az, tr, ru, en, sort, lat, lng)
JOIN "countries" c ON c."code" = v.country
ON CONFLICT ("slug") DO NOTHING;

-- Existing locations → Baku, then the columns become required.
ALTER TABLE "districts" ADD COLUMN "city_id" TEXT;
ALTER TABLE "metro_stations" ADD COLUMN "city_id" TEXT;
ALTER TABLE "universities" ADD COLUMN "city_id" TEXT;
ALTER TABLE "roommate_ads" ADD COLUMN "city_id" TEXT;

UPDATE "districts" SET "city_id" = (SELECT "id" FROM "cities" WHERE "slug" = 'baku') WHERE "city_id" IS NULL;
UPDATE "metro_stations" SET "city_id" = (SELECT "id" FROM "cities" WHERE "slug" = 'baku') WHERE "city_id" IS NULL;
UPDATE "universities" SET "city_id" = (SELECT "id" FROM "cities" WHERE "slug" = 'baku') WHERE "city_id" IS NULL;
UPDATE "roommate_ads" SET "city_id" = (SELECT "id" FROM "cities" WHERE "slug" = 'baku') WHERE "city_id" IS NULL;

ALTER TABLE "districts" ALTER COLUMN "city_id" SET NOT NULL;
ALTER TABLE "metro_stations" ALTER COLUMN "city_id" SET NOT NULL;
ALTER TABLE "universities" ALTER COLUMN "city_id" SET NOT NULL;

CREATE INDEX "districts_city_id_idx" ON "districts"("city_id");
CREATE INDEX "metro_stations_city_id_idx" ON "metro_stations"("city_id");
CREATE INDEX "universities_city_id_idx" ON "universities"("city_id");
CREATE INDEX "roommate_ads_city_id_idx" ON "roommate_ads"("city_id");

ALTER TABLE "districts" ADD CONSTRAINT "districts_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "metro_stations" ADD CONSTRAINT "metro_stations_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "universities" ADD CONSTRAINT "universities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Starter districts for the new cities (Baku's come from the seed as before).
INSERT INTO "districts" ("id", "slug", "city_id", "name_az", "name_tr", "name_ru", "name_en", "sort_order")
SELECT v.id, v.slug, ci."id", v.az, v.tr, v.ru, v.en, v.sort
FROM (VALUES
    ('district_sumqayit-merkez', 'sumqayit-merkez', 'sumqayit', 'Sumqayıt mərkəzi', 'Sumgayıt merkez', 'Центр Сумгаита', 'Sumgait centre', 1),
    ('district_kepez', 'kepez', 'ganja', 'Kəpəz', 'Kepez', 'Кяпаз', 'Kapaz', 1),
    ('district_gence-nizami', 'gence-nizami', 'ganja', 'Nizami (Gəncə)', 'Nizami (Gence)', 'Низами (Гянджа)', 'Nizami (Ganja)', 2),
    ('district_kadikoy', 'kadikoy', 'istanbul', 'Kadıköy', 'Kadıköy', 'Кадыкёй', 'Kadikoy', 1),
    ('district_besiktas', 'besiktas', 'istanbul', 'Beşiktaş', 'Beşiktaş', 'Бешикташ', 'Besiktas', 2),
    ('district_sisli', 'sisli', 'istanbul', 'Şişli', 'Şişli', 'Шишли', 'Sisli', 3),
    ('district_uskudar', 'uskudar', 'istanbul', 'Üsküdar', 'Üsküdar', 'Ускюдар', 'Uskudar', 4),
    ('district_fatih', 'fatih', 'istanbul', 'Fatih', 'Fatih', 'Фатих', 'Fatih', 5),
    ('district_cankaya', 'cankaya', 'ankara', 'Çankaya', 'Çankaya', 'Чанкая', 'Cankaya', 1),
    ('district_kecioren', 'kecioren', 'ankara', 'Keçiören', 'Keçiören', 'Кечиорен', 'Kecioren', 2),
    ('district_yenimahalle', 'yenimahalle', 'ankara', 'Yenimahalle', 'Yenimahalle', 'Енимахалле', 'Yenimahalle', 3),
    ('district_bornova', 'bornova', 'izmir', 'Bornova', 'Bornova', 'Борнова', 'Bornova', 1),
    ('district_konak', 'konak', 'izmir', 'Konak', 'Konak', 'Конак', 'Konak', 2),
    ('district_karsiyaka', 'karsiyaka', 'izmir', 'Karşıyaka', 'Karşıyaka', 'Каршияка', 'Karsiyaka', 3),
    ('district_buca', 'buca', 'izmir', 'Buca', 'Buca', 'Буджа', 'Buca', 4),
    ('district_muratpasa', 'muratpasa', 'antalya', 'Muratpaşa', 'Muratpaşa', 'Муратпаша', 'Muratpasa', 1),
    ('district_konyaalti', 'konyaalti', 'antalya', 'Konyaaltı', 'Konyaaltı', 'Коньяалты', 'Konyaalti', 2),
    ('district_nilufer', 'nilufer', 'bursa', 'Nilüfer', 'Nilüfer', 'Нилюфер', 'Nilufer', 1),
    ('district_osmangazi', 'osmangazi', 'bursa', 'Osmangazi', 'Osmangazi', 'Османгази', 'Osmangazi', 2),
    ('district_tepebasi', 'tepebasi', 'eskisehir', 'Tepebaşı', 'Tepebaşı', 'Тепебаши', 'Tepebasi', 1),
    ('district_odunpazari', 'odunpazari', 'eskisehir', 'Odunpazarı', 'Odunpazarı', 'Одунпазары', 'Odunpazari', 2)
) AS v(id, slug, city, az, tr, ru, en, sort)
JOIN "cities" ci ON ci."slug" = v.city
ON CONFLICT ("slug") DO NOTHING;
