-- Data fix: university main-campus positions, districts and nearest metro
-- stations re-checked against OpenStreetMap (2026-10). The earlier values put
-- several campuses at the wrong metro (AzMİU at İnşaatçılar instead of Elmlər
-- Akademiyası, ADA without Gənclik, ATU without 8 Noyabr). Mirrors
-- prisma/reference-data.ts and UNIVERSITY_COORDS in src/lib/baku-geo.ts.

UPDATE "universities" SET "latitude" = 40.3739, "longitude" = 49.811,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'yasamal'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'elmler-akademiyasi')
WHERE "slug" = 'bdu';

UPDATE "universities" SET "latitude" = 40.3677, "longitude" = 49.8321,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'sebail'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'icerisheher')
WHERE "slug" = 'unec';

UPDATE "universities" SET "latitude" = 40.3786, "longitude" = 49.8487,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nesimi'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = '28-may')
WHERE "slug" = 'adnsu';

UPDATE "universities" SET "latitude" = 40.3701, "longitude" = 49.8154,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'yasamal'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'elmler-akademiyasi')
WHERE "slug" = 'aztu';

UPDATE "universities" SET "latitude" = 40.3698, "longitude" = 49.8126,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'yasamal'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'elmler-akademiyasi')
WHERE "slug" = 'azmiu';

UPDATE "universities" SET "latitude" = 40.3729, "longitude" = 49.8479,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'sebail'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'sahil')
WHERE "slug" = 'adpu';

UPDATE "universities" SET "latitude" = 40.3958, "longitude" = 49.8329,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nesimi'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = '8-noyabr')
WHERE "slug" = 'atu';

UPDATE "universities" SET "latitude" = 40.3964, "longitude" = 49.8498,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nerimanov'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'genclik')
WHERE "slug" = 'ada';

UPDATE "universities" SET "latitude" = 40.3823, "longitude" = 49.8721,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'xetai'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'xetai')
WHERE "slug" = 'bhos';

UPDATE "universities" SET "latitude" = 40.4082, "longitude" = 49.9372,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nizami'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = 'neftciler')
WHERE "slug" = 'khazar';

UPDATE "universities" SET "latitude" = 40.3835, "longitude" = 49.8429,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nesimi'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = '28-may')
WHERE "slug" = 'adu';

UPDATE "universities" SET "latitude" = 40.3837, "longitude" = 49.8437,
  "district_id" = (SELECT "id" FROM "districts" WHERE "slug" = 'nesimi'),
  "nearest_metro_id" = (SELECT "id" FROM "metro_stations" WHERE "slug" = '28-may')
WHERE "slug" = 'bsu';

-- İçərişəhər never got coordinates (slug typo in the built-in table), and
-- İnşaatçılar was ~280 m north of its real position.
UPDATE "metro_stations" SET "latitude" = 40.3659, "longitude" = 49.8317
WHERE "slug" = 'icerisheher' AND "latitude" IS NULL;

UPDATE "metro_stations" SET "latitude" = 40.3891, "longitude" = 49.8024
WHERE "slug" = 'insaatcilar' AND "latitude" = 40.3916 AND "longitude" = 49.8025;
