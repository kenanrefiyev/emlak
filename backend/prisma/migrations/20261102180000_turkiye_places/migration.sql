-- Places for the Türkiye market (and map positions for districts outside
-- Baku): district centres, main student neighbourhoods and universities.
-- Mirrors backend/prisma/reference-data.ts; positions are approximate and
-- admin-editable. Inserts skip slugs that already exist, and coordinates are
-- only filled where none are set, so admin edits are never overwritten.

ALTER TABLE "districts" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "districts" ADD COLUMN "longitude" DOUBLE PRECISION;

UPDATE "districts" d SET "latitude" = v.lat, "longitude" = v.lng
FROM (VALUES
    ('sumqayit-merkez', 40.5897, 49.6686),
    ('kepez', 40.695, 46.37),
    ('gence-nizami', 40.675, 46.35),
    ('kadikoy', 40.991, 29.027),
    ('besiktas', 41.043, 29.007),
    ('sisli', 41.06, 28.987),
    ('uskudar', 41.023, 29.015),
    ('fatih', 41.019, 28.94),
    ('cankaya', 39.903, 32.86),
    ('kecioren', 39.98, 32.864),
    ('yenimahalle', 39.969, 32.809),
    ('bornova', 38.465, 27.221),
    ('konak', 38.418, 27.129),
    ('karsiyaka', 38.46, 27.11),
    ('buca', 38.388, 27.175),
    ('muratpasa', 36.885, 30.71),
    ('konyaalti', 36.87, 30.635),
    ('nilufer', 40.214, 28.99),
    ('osmangazi', 40.195, 29.06),
    ('tepebasi', 39.79, 30.499),
    ('odunpazari', 39.765, 30.525)
) AS v(slug, lat, lng)
WHERE d."slug" = v.slug AND d."latitude" IS NULL;

INSERT INTO "neighborhoods" ("id", "slug", "district_id", "name_az", "name_tr", "name_ru", "name_en", "is_popular", "latitude", "longitude")
SELECT v.id, v.slug, d."id", v.az, v.tr, v.ru, v.en, v.popular, v.lat, v.lng
FROM (VALUES
    ('nb_moda', 'moda', 'kadikoy', 'Moda', 'Moda', 'Мода', 'Moda', true, 40.9845, 29.0262),
    ('nb_fenerbahce', 'fenerbahce', 'kadikoy', 'Fənərbağça', 'Fenerbahçe', 'Фенербахче', 'Fenerbahce', false, 40.9707, 29.0367),
    ('nb_goztepe', 'goztepe', 'kadikoy', 'Göztəpə', 'Göztepe', 'Гёзтепе', 'Goztepe', false, 40.9785, 29.0614),
    ('nb_levent', 'levent', 'besiktas', 'Levent', 'Levent', 'Левент', 'Levent', false, 41.079, 29.0109),
    ('nb_etiler', 'etiler', 'besiktas', 'Etiler', 'Etiler', 'Этилер', 'Etiler', false, 41.0817, 29.0335),
    ('nb_ortakoy', 'ortakoy', 'besiktas', 'Ortaköy', 'Ortaköy', 'Ортакёй', 'Ortakoy', false, 41.0479, 29.0262),
    ('nb_mecidiyekoy', 'mecidiyekoy', 'sisli', 'Məcidiyyəköy', 'Mecidiyeköy', 'Меджидиекёй', 'Mecidiyekoy', true, 41.0675, 28.9963),
    ('nb_nisantasi', 'nisantasi', 'sisli', 'Nişantaşı', 'Nişantaşı', 'Нишанташы', 'Nisantasi', false, 41.0505, 28.9937),
    ('nb_altunizade', 'altunizade', 'uskudar', 'Altunizadə', 'Altunizade', 'Алтунизаде', 'Altunizade', false, 41.0222, 29.0447),
    ('nb_acibadem', 'acibadem', 'uskudar', 'Acıbadəm', 'Acıbadem', 'Аджыбадем', 'Acibadem', false, 41.0049, 29.0435),
    ('nb_aksaray', 'aksaray', 'fatih', 'Aksaray', 'Aksaray', 'Аксарай', 'Aksaray', false, 41.0075, 28.953),
    ('nb_beyazit', 'beyazit', 'fatih', 'Bəyazit', 'Beyazıt', 'Беязыт', 'Beyazit', false, 41.0105, 28.964),
    ('nb_kizilay', 'kizilay', 'cankaya', 'Qızılay', 'Kızılay', 'Кызылай', 'Kizilay', true, 39.9208, 32.8541),
    ('nb_bahcelievler', 'bahcelievler', 'cankaya', 'Bağçəlievlər', 'Bahçelievler', 'Бахчелиэвлер', 'Bahcelievler', false, 39.9238, 32.8226),
    ('nb_ayranci', 'ayranci', 'cankaya', 'Ayrancı', 'Ayrancı', 'Айранджы', 'Ayranci', false, 39.901, 32.853),
    ('nb_kazimdirik', 'kazimdirik', 'bornova', 'Kazımdirik', 'Kazımdirik', 'Казымдирик', 'Kazimdirik', false, 38.458, 27.219),
    ('nb_alsancak', 'alsancak', 'konak', 'Alsancaq', 'Alsancak', 'Алсанджак', 'Alsancak', true, 38.438, 27.143)
) AS v(id, slug, district, az, tr, ru, en, popular, lat, lng)
JOIN "districts" d ON d."slug" = v.district
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "universities" ("id", "slug", "short_name", "city_id", "district_id", "name_az", "name_tr", "name_ru", "name_en", "latitude", "longitude")
SELECT v.id, v.slug, v.short, c."id", d."id", v.az, v.tr, v.ru, v.en, v.lat, v.lng
FROM (VALUES
    ('uni_itu', 'itu', 'İTÜ', 'istanbul', NULL, 'İstanbul Texniki Universiteti', 'İstanbul Teknik Üniversitesi', 'Стамбульский технический университет', 'Istanbul Technical University', 41.1055, 29.025),
    ('uni_bogazici', 'bogazici', 'Boğaziçi', 'istanbul', 'besiktas', 'Boğaziçi Universiteti', 'Boğaziçi Üniversitesi', 'Университет Богазичи', 'Boğaziçi University', 41.0839, 29.0503),
    ('uni_istanbul-uni', 'istanbul-uni', 'İÜ', 'istanbul', 'fatih', 'İstanbul Universiteti', 'İstanbul Üniversitesi', 'Стамбульский университет', 'Istanbul University', 41.013, 28.9636),
    ('uni_marmara', 'marmara', 'Marmara', 'istanbul', 'kadikoy', 'Marmara Universiteti', 'Marmara Üniversitesi', 'Университет Мармара', 'Marmara University', 40.9875, 29.057),
    ('uni_ytu', 'ytu', 'YTÜ', 'istanbul', 'besiktas', 'Yıldız Texniki Universiteti', 'Yıldız Teknik Üniversitesi', 'Технический университет Йылдыз', 'Yildiz Technical University', 41.0518, 29.0105),
    ('uni_odtu', 'odtu', 'ODTÜ', 'ankara', 'cankaya', 'Orta Şərq Texniki Universiteti', 'Orta Doğu Teknik Üniversitesi', 'Ближневосточный технический университет', 'Middle East Technical University', 39.8915, 32.7838),
    ('uni_ankara-uni', 'ankara-uni', 'AÜ', 'ankara', 'cankaya', 'Ankara Universiteti', 'Ankara Üniversitesi', 'Анкарский университет', 'Ankara University', 39.935, 32.829),
    ('uni_hacettepe', 'hacettepe', 'Hacettepe', 'ankara', 'cankaya', 'Hacettepe Universiteti', 'Hacettepe Üniversitesi', 'Университет Хаджеттепе', 'Hacettepe University', 39.8665, 32.7345),
    ('uni_bilkent', 'bilkent', 'Bilkent', 'ankara', 'cankaya', 'Bilkent Universiteti', 'Bilkent Üniversitesi', 'Университет Билкент', 'Bilkent University', 39.8687, 32.749),
    ('uni_ege', 'ege', 'Ege', 'izmir', 'bornova', 'Egey Universiteti', 'Ege Üniversitesi', 'Эгейский университет', 'Ege University', 38.456, 27.227),
    ('uni_deu', 'deu', 'DEÜ', 'izmir', 'buca', 'Dokuz Eylül Universiteti', 'Dokuz Eylül Üniversitesi', 'Университет Девятого сентября', 'Dokuz Eylül University', 38.3695, 27.2045),
    ('uni_akdeniz', 'akdeniz', 'Akdeniz', 'antalya', 'konyaalti', 'Akdeniz Universiteti', 'Akdeniz Üniversitesi', 'Средиземноморский университет', 'Akdeniz University', 36.8975, 30.6505),
    ('uni_uludag', 'uludag', 'BUÜ', 'bursa', 'nilufer', 'Bursa Uludağ Universiteti', 'Bursa Uludağ Üniversitesi', 'Университет Улудаг (Бурса)', 'Bursa Uludağ University', 40.2245, 28.871),
    ('uni_anadolu', 'anadolu', 'Anadolu', 'eskisehir', 'tepebasi', 'Anadolu Universiteti', 'Anadolu Üniversitesi', 'Анатолийский университет', 'Anadolu University', 39.7905, 30.4995),
    ('uni_esogu', 'esogu', 'ESOGÜ', 'eskisehir', 'odunpazari', 'Eskişehir Osmanqazi Universiteti', 'Eskişehir Osmangazi Üniversitesi', 'Университет Османгази (Эскишехир)', 'Eskişehir Osmangazi University', 39.7505, 30.483)
) AS v(id, slug, short, city, district, az, tr, ru, en, lat, lng)
JOIN "cities" c ON c."slug" = v.city
LEFT JOIN "districts" d ON d."slug" = v.district
ON CONFLICT ("slug") DO NOTHING;
