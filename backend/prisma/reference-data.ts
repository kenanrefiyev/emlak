// Reference data. Markets: Azerbaijan and Türkiye (countries → cities →
// districts). Baku additionally has neighborhoods, metro and universities.
// Mirrored by migration 20261102120000_countries_cities so existing databases
// get the same rows. Baku details: Station list per the Baku Metro station list (27 open
// stations, 3 lines). Station→district links are intentionally left empty and
// neighborhood→district links are given only where well known. University
// district and nearest metro follow the main campus position in OpenStreetMap
// (see UNIVERSITY_COORDS in backend/lib/baku-geo.ts); admins can correct
// everything in /admin (Ərazilər, Metro, Universitetlər).

type Names = [az: string, tr: string, ru: string, en: string];

export const COUNTRIES: { code: string; currency: string; names: Names; sort: number; at: [number, number] }[] = [
  { code: "az", currency: "AZN", names: ["Azərbaycan", "Azerbaycan", "Азербайджан", "Azerbaijan"], sort: 1, at: [40.4093, 49.8671] },
  { code: "tr", currency: "TRY", names: ["Türkiyə", "Türkiye", "Турция", "Turkey"], sort: 2, at: [39.0, 35.0] },
];

export const CITIES: { slug: string; country: string; names: Names; sort: number; at: [number, number] }[] = [
  { slug: "baku", country: "az", names: ["Bakı", "Bakü", "Баку", "Baku"], sort: 1, at: [40.4093, 49.8671] },
  { slug: "sumqayit", country: "az", names: ["Sumqayıt", "Sumgayıt", "Сумгаит", "Sumgait"], sort: 2, at: [40.5897, 49.6686] },
  { slug: "ganja", country: "az", names: ["Gəncə", "Gence", "Гянджа", "Ganja"], sort: 3, at: [40.6828, 46.3606] },
  { slug: "istanbul", country: "tr", names: ["İstanbul", "İstanbul", "Стамбул", "Istanbul"], sort: 1, at: [41.0082, 28.9784] },
  { slug: "ankara", country: "tr", names: ["Ankara", "Ankara", "Анкара", "Ankara"], sort: 2, at: [39.9334, 32.8597] },
  { slug: "izmir", country: "tr", names: ["İzmir", "İzmir", "Измир", "Izmir"], sort: 3, at: [38.4237, 27.1428] },
  { slug: "antalya", country: "tr", names: ["Antalya", "Antalya", "Анталья", "Antalya"], sort: 4, at: [36.8969, 30.7133] },
  { slug: "bursa", country: "tr", names: ["Bursa", "Bursa", "Бурса", "Bursa"], sort: 5, at: [40.1885, 29.061] },
  { slug: "eskisehir", country: "tr", names: ["Eskişehir", "Eskişehir", "Эскишехир", "Eskisehir"], sort: 6, at: [39.7767, 30.5206] },
];

// `at`: approximate centre, for map positions when a listing has no finer place.
export const DISTRICTS: { slug: string; city: string; names: Names; sort: number; at?: [number, number] }[] = [
  { slug: "yasamal", city: "baku", names: ["Yasamal", "Yasamal", "Ясамал", "Yasamal"], sort: 1 },
  { slug: "nesimi", city: "baku", names: ["Nəsimi", "Nesimi", "Насими", "Nasimi"], sort: 2 },
  { slug: "nerimanov", city: "baku", names: ["Nərimanov", "Nerimanov", "Нариманов", "Narimanov"], sort: 3 },
  { slug: "sebail", city: "baku", names: ["Səbail", "Sebail", "Сабаил", "Sabail"], sort: 4 },
  { slug: "xetai", city: "baku", names: ["Xətai", "Hatai", "Хатаи", "Khatai"], sort: 5 },
  { slug: "nizami", city: "baku", names: ["Nizami", "Nizami", "Низами", "Nizami"], sort: 6 },
  { slug: "binegedi", city: "baku", names: ["Binəqədi", "Binegedi", "Бинагади", "Binagadi"], sort: 7 },
  { slug: "sabuncu", city: "baku", names: ["Sabunçu", "Sabunçu", "Сабунчу", "Sabunchu"], sort: 8 },
  { slug: "suraxani", city: "baku", names: ["Suraxanı", "Suraxanı", "Сураханы", "Surakhani"], sort: 9 },
  { slug: "xezer", city: "baku", names: ["Xəzər", "Hazar", "Хазар", "Khazar"], sort: 10 },
  { slug: "qaradag", city: "baku", names: ["Qaradağ", "Karadağ", "Гарадаг", "Garadagh"], sort: 11 },
  { slug: "pirallahi", city: "baku", names: ["Pirallahı", "Pirallahı", "Пираллахи", "Pirallahi"], sort: 12 },
  // Other cities start with their main districts; admins add more in /admin.
  { slug: "sumqayit-merkez", city: "sumqayit", names: ["Sumqayıt mərkəzi", "Sumgayıt merkez", "Центр Сумгаита", "Sumgait centre"], sort: 1, at: [40.5897, 49.6686] },
  { slug: "kepez", city: "ganja", names: ["Kəpəz", "Kepez", "Кяпаз", "Kapaz"], sort: 1, at: [40.695, 46.37] },
  { slug: "gence-nizami", city: "ganja", names: ["Nizami (Gəncə)", "Nizami (Gence)", "Низами (Гянджа)", "Nizami (Ganja)"], sort: 2, at: [40.675, 46.35] },
  { slug: "kadikoy", city: "istanbul", names: ["Kadıköy", "Kadıköy", "Кадыкёй", "Kadikoy"], sort: 1, at: [40.991, 29.027] },
  { slug: "besiktas", city: "istanbul", names: ["Beşiktaş", "Beşiktaş", "Бешикташ", "Besiktas"], sort: 2, at: [41.043, 29.007] },
  { slug: "sisli", city: "istanbul", names: ["Şişli", "Şişli", "Шишли", "Sisli"], sort: 3, at: [41.06, 28.987] },
  { slug: "uskudar", city: "istanbul", names: ["Üsküdar", "Üsküdar", "Ускюдар", "Uskudar"], sort: 4, at: [41.023, 29.015] },
  { slug: "fatih", city: "istanbul", names: ["Fatih", "Fatih", "Фатих", "Fatih"], sort: 5, at: [41.019, 28.94] },
  { slug: "cankaya", city: "ankara", names: ["Çankaya", "Çankaya", "Чанкая", "Cankaya"], sort: 1, at: [39.903, 32.86] },
  { slug: "kecioren", city: "ankara", names: ["Keçiören", "Keçiören", "Кечиорен", "Kecioren"], sort: 2, at: [39.98, 32.864] },
  { slug: "yenimahalle", city: "ankara", names: ["Yenimahalle", "Yenimahalle", "Енимахалле", "Yenimahalle"], sort: 3, at: [39.969, 32.809] },
  { slug: "bornova", city: "izmir", names: ["Bornova", "Bornova", "Борнова", "Bornova"], sort: 1, at: [38.465, 27.221] },
  { slug: "konak", city: "izmir", names: ["Konak", "Konak", "Конак", "Konak"], sort: 2, at: [38.418, 27.129] },
  { slug: "karsiyaka", city: "izmir", names: ["Karşıyaka", "Karşıyaka", "Каршияка", "Karsiyaka"], sort: 3, at: [38.46, 27.11] },
  { slug: "buca", city: "izmir", names: ["Buca", "Buca", "Буджа", "Buca"], sort: 4, at: [38.388, 27.175] },
  { slug: "muratpasa", city: "antalya", names: ["Muratpaşa", "Muratpaşa", "Муратпаша", "Muratpasa"], sort: 1, at: [36.885, 30.71] },
  { slug: "konyaalti", city: "antalya", names: ["Konyaaltı", "Konyaaltı", "Коньяалты", "Konyaalti"], sort: 2, at: [36.87, 30.635] },
  { slug: "nilufer", city: "bursa", names: ["Nilüfer", "Nilüfer", "Нилюфер", "Nilufer"], sort: 1, at: [40.214, 28.99] },
  { slug: "osmangazi", city: "bursa", names: ["Osmangazi", "Osmangazi", "Османгази", "Osmangazi"], sort: 2, at: [40.195, 29.06] },
  { slug: "tepebasi", city: "eskisehir", names: ["Tepebaşı", "Tepebaşı", "Тепебаши", "Tepebasi"], sort: 1, at: [39.79, 30.499] },
  { slug: "odunpazari", city: "eskisehir", names: ["Odunpazarı", "Odunpazarı", "Одунпазары", "Odunpazari"], sort: 2, at: [39.765, 30.525] },
];

// `at`: approximate area centre (Baku's come from NEIGHBORHOOD_COORDS in lib/baku-geo).
export const NEIGHBORHOODS: { slug: string; district: string; names: Names; popular?: boolean; at?: [number, number] }[] = [
  { slug: "genclik", district: "nerimanov", names: ["Gənclik", "Gençlik", "Гянджлик", "Ganjlik"], popular: true },
  { slug: "nerimanov-metro", district: "nerimanov", names: ["Nəriman Nərimanov m.", "Neriman Nerimanov m.", "м. Нариман Нариманов", "Nariman Narimanov (metro)"], popular: true },
  { slug: "ulduz", district: "nerimanov", names: ["Ulduz", "Ulduz", "Улдуз", "Ulduz"] },
  { slug: "elmler-akademiyasi", district: "yasamal", names: ["Elmlər Akademiyası", "Bilimler Akademisi", "Эльмляр Академиясы", "Elmlar Akademiyasi"], popular: true },
  { slug: "insaatcilar", district: "yasamal", names: ["İnşaatçılar", "İnşaatçılar", "Иншаатчылар", "Inshaatchilar"], popular: true },
  { slug: "yeni-yasamal", district: "yasamal", names: ["Yeni Yasamal", "Yeni Yasamal", "Новый Ясамал", "New Yasamal"] },
  { slug: "28-may", district: "nesimi", names: ["28 May", "28 Mayıs", "28 Мая", "28 May"], popular: true },
  { slug: "nizami-kucesi", district: "nesimi", names: ["Nizami küçəsi", "Nizami caddesi", "улица Низами", "Nizami Street"] },
  { slug: "icerisheher", district: "sebail", names: ["İçərişəhər", "İçerişehir", "Ичеришехер", "Icherisheher"], popular: true },
  { slug: "sahil", district: "sebail", names: ["Sahil", "Sahil", "Сахил", "Sahil"] },
  { slug: "badamdar", district: "sebail", names: ["Badamdar", "Badamdar", "Бадамдар", "Badamdar"] },
  { slug: "xetai-metro", district: "xetai", names: ["Xətai m.", "Hatai m.", "м. Хатаи", "Khatai (metro)"], popular: true },
  { slug: "ehmedli", district: "xetai", names: ["Əhmədli", "Ehmedli", "Ахмедлы", "Ahmadli"] },
  { slug: "hezi-aslanov", district: "xetai", names: ["Həzi Aslanov", "Hezi Aslanov", "Ази Асланов", "Hazi Aslanov"] },
  { slug: "koroglu", district: "nizami", names: ["Koroğlu", "Köroğlu", "Кёроглу", "Koroglu"], popular: true },
  { slug: "neftciler", district: "nizami", names: ["Neftçilər", "Neftçiler", "Нефтчиляр", "Neftchilar"] },
  { slug: "qara-qarayev", district: "nizami", names: ["Qara Qarayev", "Kara Karayev", "Кара Караев", "Gara Garayev"] },
  { slug: "azadliq-prospekti", district: "binegedi", names: ["Azadlıq prospekti", "Azadlık prospekti", "проспект Азадлыг", "Azadlig Avenue"] },
  { slug: "8-mkr", district: "binegedi", names: ["8-ci mikrorayon", "8. mikrorayon", "8-й микрорайон", "8th microdistrict"] },
  { slug: "bakixanov", district: "sabuncu", names: ["Bakıxanov", "Bakıhanov", "Бакиханов", "Bakikhanov"] },
  // Türkiye — main student and central areas; positions are approximate area centres.
  { slug: "moda", district: "kadikoy", names: ["Moda", "Moda", "Мода", "Moda"], popular: true, at: [40.9845, 29.0262] },
  { slug: "fenerbahce", district: "kadikoy", names: ["Fənərbağça", "Fenerbahçe", "Фенербахче", "Fenerbahce"], at: [40.9707, 29.0367] },
  { slug: "goztepe", district: "kadikoy", names: ["Göztəpə", "Göztepe", "Гёзтепе", "Goztepe"], at: [40.9785, 29.0614] },
  { slug: "levent", district: "besiktas", names: ["Levent", "Levent", "Левент", "Levent"], at: [41.079, 29.0109] },
  { slug: "etiler", district: "besiktas", names: ["Etiler", "Etiler", "Этилер", "Etiler"], at: [41.0817, 29.0335] },
  { slug: "ortakoy", district: "besiktas", names: ["Ortaköy", "Ortaköy", "Ортакёй", "Ortakoy"], at: [41.0479, 29.0262] },
  { slug: "mecidiyekoy", district: "sisli", names: ["Məcidiyyəköy", "Mecidiyeköy", "Меджидиекёй", "Mecidiyekoy"], popular: true, at: [41.0675, 28.9963] },
  { slug: "nisantasi", district: "sisli", names: ["Nişantaşı", "Nişantaşı", "Нишанташы", "Nisantasi"], at: [41.0505, 28.9937] },
  { slug: "altunizade", district: "uskudar", names: ["Altunizadə", "Altunizade", "Алтунизаде", "Altunizade"], at: [41.0222, 29.0447] },
  { slug: "acibadem", district: "uskudar", names: ["Acıbadəm", "Acıbadem", "Аджыбадем", "Acibadem"], at: [41.0049, 29.0435] },
  { slug: "aksaray", district: "fatih", names: ["Aksaray", "Aksaray", "Аксарай", "Aksaray"], at: [41.0075, 28.953] },
  { slug: "beyazit", district: "fatih", names: ["Bəyazit", "Beyazıt", "Беязыт", "Beyazit"], at: [41.0105, 28.964] },
  { slug: "kizilay", district: "cankaya", names: ["Qızılay", "Kızılay", "Кызылай", "Kizilay"], popular: true, at: [39.9208, 32.8541] },
  { slug: "bahcelievler", district: "cankaya", names: ["Bağçəlievlər", "Bahçelievler", "Бахчелиэвлер", "Bahcelievler"], at: [39.9238, 32.8226] },
  { slug: "ayranci", district: "cankaya", names: ["Ayrancı", "Ayrancı", "Айранджы", "Ayranci"], at: [39.901, 32.853] },
  { slug: "kazimdirik", district: "bornova", names: ["Kazımdirik", "Kazımdirik", "Казымдирик", "Kazimdirik"], at: [38.458, 27.219] },
  { slug: "alsancak", district: "konak", names: ["Alsancaq", "Alsancak", "Алсанджак", "Alsancak"], popular: true, at: [38.438, 27.143] },
];

export const METRO: { slug: string; line: "RED" | "GREEN" | "PURPLE"; names: Names }[] = [
  // Red line (M1)
  { slug: "icerisheher", line: "RED", names: ["İçərişəhər", "İçərişəhər", "Ичеришехер", "Icherisheher"] },
  { slug: "sahil", line: "RED", names: ["Sahil", "Sahil", "Сахил", "Sahil"] },
  { slug: "28-may", line: "RED", names: ["28 May", "28 May", "28 Мая", "28 May"] },
  { slug: "genclik", line: "RED", names: ["Gənclik", "Gənclik", "Гянджлик", "Ganjlik"] },
  { slug: "nerimanov", line: "RED", names: ["Nəriman Nərimanov", "Nəriman Nərimanov", "Нариман Нариманов", "Nariman Narimanov"] },
  { slug: "bakmil", line: "RED", names: ["Bakmil", "Bakmil", "Бакмил", "Bakmil"] },
  { slug: "ulduz", line: "RED", names: ["Ulduz", "Ulduz", "Улдуз", "Ulduz"] },
  { slug: "koroglu", line: "RED", names: ["Koroğlu", "Koroğlu", "Кёроглу", "Koroglu"] },
  { slug: "qara-qarayev", line: "RED", names: ["Qara Qarayev", "Qara Qarayev", "Кара Караев", "Gara Garayev"] },
  { slug: "neftciler", line: "RED", names: ["Neftçilər", "Neftçilər", "Нефтчиляр", "Neftchilar"] },
  { slug: "xalqlar-dostlugu", line: "RED", names: ["Xalqlar Dostluğu", "Xalqlar Dostluğu", "Халглар Достлугу", "Khalglar Dostlugu"] },
  { slug: "ehmedli", line: "RED", names: ["Əhmədli", "Əhmədli", "Ахмедлы", "Ahmadli"] },
  { slug: "hezi-aslanov", line: "RED", names: ["Həzi Aslanov", "Həzi Aslanov", "Ази Асланов", "Hazi Aslanov"] },
  // Green line (M2)
  { slug: "dernegul", line: "GREEN", names: ["Dərnəgül", "Dərnəgül", "Дарнагюль", "Darnagul"] },
  { slug: "azadliq-prospekti", line: "GREEN", names: ["Azadlıq prospekti", "Azadlıq prospekti", "Азадлыг проспекти", "Azadlig Prospekti"] },
  { slug: "nesimi", line: "GREEN", names: ["Nəsimi", "Nəsimi", "Насими", "Nasimi"] },
  { slug: "memar-ecemi", line: "GREEN", names: ["Memar Əcəmi", "Memar Əcəmi", "Мемар Аджеми", "Memar Ajami"] },
  { slug: "20-yanvar", line: "GREEN", names: ["20 Yanvar", "20 Yanvar", "20 Января", "20 Yanvar"] },
  { slug: "insaatcilar", line: "GREEN", names: ["İnşaatçılar", "İnşaatçılar", "Иншаатчылар", "Inshaatchilar"] },
  { slug: "elmler-akademiyasi", line: "GREEN", names: ["Elmlər Akademiyası", "Elmlər Akademiyası", "Эльмляр Академиясы", "Elmlar Akademiyasi"] },
  { slug: "nizami", line: "GREEN", names: ["Nizami", "Nizami", "Низами", "Nizami Ganjavi"] },
  { slug: "cefer-cabbarli", line: "GREEN", names: ["Cəfər Cabbarlı", "Cəfər Cabbarlı", "Джафар Джаббарлы", "Jafar Jabbarli"] },
  { slug: "xetai", line: "GREEN", names: ["Şah İsmayıl Xətai", "Şah İsmayıl Xətai", "Шах Исмаил Хатаи", "Shah Ismail Khatai"] },
  // Purple line (M3)
  { slug: "xocesen", line: "PURPLE", names: ["Xocəsən", "Xocəsən", "Ходжасан", "Khojasan"] },
  { slug: "avtovagzal", line: "PURPLE", names: ["Avtovağzal", "Avtovağzal", "Автовагзал", "Avtovaghzal"] },
  { slug: "memar-ecemi-2", line: "PURPLE", names: ["Memar Əcəmi-2", "Memar Əcəmi-2", "Мемар Аджеми-2", "Memar Ajami-2"] },
  { slug: "8-noyabr", line: "PURPLE", names: ["8 Noyabr", "8 Noyabr", "8 Ноября", "8 Noyabr"] },
];

// `city` defaults to Baku; `at` is used where UNIVERSITY_COORDS (Baku) has no entry.
export const UNIVERSITIES: { slug: string; short: string; city?: string; district?: string; metro?: string; at?: [number, number]; names: Names }[] = [
  { slug: "bdu", short: "BDU", district: "yasamal", metro: "elmler-akademiyasi", names: ["Bakı Dövlət Universiteti", "Bakü Devlet Üniversitesi", "Бакинский государственный университет", "Baku State University"] },
  { slug: "unec", short: "UNEC", district: "sebail", metro: "icerisheher", names: ["Azərbaycan Dövlət İqtisad Universiteti", "Azerbaycan Devlet Ekonomi Üniversitesi", "Азербайджанский государственный экономический университет", "Azerbaijan State University of Economics"] },
  { slug: "adnsu", short: "ADNSU", district: "nesimi", metro: "28-may", names: ["Azərbaycan Dövlət Neft və Sənaye Universiteti", "Azerbaycan Devlet Petrol ve Sanayi Üniversitesi", "Азербайджанский государственный университет нефти и промышленности", "Azerbaijan State Oil and Industry University"] },
  { slug: "aztu", short: "AzTU", district: "yasamal", metro: "elmler-akademiyasi", names: ["Azərbaycan Texniki Universiteti", "Azerbaycan Teknik Üniversitesi", "Азербайджанский технический университет", "Azerbaijan Technical University"] },
  { slug: "azmiu", short: "AzMİU", district: "yasamal", metro: "elmler-akademiyasi", names: ["Azərbaycan Memarlıq və İnşaat Universiteti", "Azerbaycan Mimarlık ve İnşaat Üniversitesi", "Азербайджанский архитектурно-строительный университет", "Azerbaijan University of Architecture and Construction"] },
  { slug: "adpu", short: "ADPU", district: "sebail", metro: "sahil", names: ["Azərbaycan Dövlət Pedaqoji Universiteti", "Azerbaycan Devlet Pedagoji Üniversitesi", "Азербайджанский государственный педагогический университет", "Azerbaijan State Pedagogical University"] },
  { slug: "atu", short: "ATU", district: "nesimi", metro: "8-noyabr", names: ["Azərbaycan Tibb Universiteti", "Azerbaycan Tıp Üniversitesi", "Азербайджанский медицинский университет", "Azerbaijan Medical University"] },
  { slug: "ada", short: "ADA", district: "nerimanov", metro: "genclik", names: ["ADA Universiteti", "ADA Üniversitesi", "Университет ADA", "ADA University"] },
  { slug: "bhos", short: "BANM", district: "xetai", metro: "xetai", names: ["Bakı Ali Neft Məktəbi", "Bakü Yüksek Petrol Okulu", "Бакинская высшая школа нефти", "Baku Higher Oil School"] },
  { slug: "khazar", short: "Xəzər", district: "nizami", metro: "neftciler", names: ["Xəzər Universiteti", "Hazar Üniversitesi", "Университет Хазар", "Khazar University"] },
  { slug: "adu", short: "ADU", district: "nesimi", metro: "28-may", names: ["Azərbaycan Dillər Universiteti", "Azerbaycan Diller Üniversitesi", "Азербайджанский университет языков", "Azerbaijan University of Languages"] },
  { slug: "bsu", short: "BSU", district: "nesimi", metro: "28-may", names: ["Bakı Slavyan Universiteti", "Bakü Slav Üniversitesi", "Бакинский славянский университет", "Baku Slavic University"] },
  // Türkiye — main campus positions, approximate; admins can correct them in /admin.
  { slug: "itu", short: "İTÜ", city: "istanbul", at: [41.1055, 29.025], names: ["İstanbul Texniki Universiteti", "İstanbul Teknik Üniversitesi", "Стамбульский технический университет", "Istanbul Technical University"] },
  { slug: "bogazici", short: "Boğaziçi", city: "istanbul", district: "besiktas", at: [41.0839, 29.0503], names: ["Boğaziçi Universiteti", "Boğaziçi Üniversitesi", "Университет Богазичи", "Boğaziçi University"] },
  { slug: "istanbul-uni", short: "İÜ", city: "istanbul", district: "fatih", at: [41.013, 28.9636], names: ["İstanbul Universiteti", "İstanbul Üniversitesi", "Стамбульский университет", "Istanbul University"] },
  { slug: "marmara", short: "Marmara", city: "istanbul", district: "kadikoy", at: [40.9875, 29.057], names: ["Marmara Universiteti", "Marmara Üniversitesi", "Университет Мармара", "Marmara University"] },
  { slug: "ytu", short: "YTÜ", city: "istanbul", district: "besiktas", at: [41.0518, 29.0105], names: ["Yıldız Texniki Universiteti", "Yıldız Teknik Üniversitesi", "Технический университет Йылдыз", "Yildiz Technical University"] },
  { slug: "odtu", short: "ODTÜ", city: "ankara", district: "cankaya", at: [39.8915, 32.7838], names: ["Orta Şərq Texniki Universiteti", "Orta Doğu Teknik Üniversitesi", "Ближневосточный технический университет", "Middle East Technical University"] },
  { slug: "ankara-uni", short: "AÜ", city: "ankara", district: "cankaya", at: [39.935, 32.829], names: ["Ankara Universiteti", "Ankara Üniversitesi", "Анкарский университет", "Ankara University"] },
  { slug: "hacettepe", short: "Hacettepe", city: "ankara", district: "cankaya", at: [39.8665, 32.7345], names: ["Hacettepe Universiteti", "Hacettepe Üniversitesi", "Университет Хаджеттепе", "Hacettepe University"] },
  { slug: "bilkent", short: "Bilkent", city: "ankara", district: "cankaya", at: [39.8687, 32.749], names: ["Bilkent Universiteti", "Bilkent Üniversitesi", "Университет Билкент", "Bilkent University"] },
  { slug: "ege", short: "Ege", city: "izmir", district: "bornova", at: [38.456, 27.227], names: ["Egey Universiteti", "Ege Üniversitesi", "Эгейский университет", "Ege University"] },
  { slug: "deu", short: "DEÜ", city: "izmir", district: "buca", at: [38.3695, 27.2045], names: ["Dokuz Eylül Universiteti", "Dokuz Eylül Üniversitesi", "Университет Девятого сентября", "Dokuz Eylül University"] },
  { slug: "akdeniz", short: "Akdeniz", city: "antalya", district: "konyaalti", at: [36.8975, 30.6505], names: ["Akdeniz Universiteti", "Akdeniz Üniversitesi", "Средиземноморский университет", "Akdeniz University"] },
  { slug: "uludag", short: "BUÜ", city: "bursa", district: "nilufer", at: [40.2245, 28.871], names: ["Bursa Uludağ Universiteti", "Bursa Uludağ Üniversitesi", "Университет Улудаг (Бурса)", "Bursa Uludağ University"] },
  { slug: "anadolu", short: "Anadolu", city: "eskisehir", district: "tepebasi", at: [39.7905, 30.4995], names: ["Anadolu Universiteti", "Anadolu Üniversitesi", "Анатолийский университет", "Anadolu University"] },
  { slug: "esogu", short: "ESOGÜ", city: "eskisehir", district: "odunpazari", at: [39.7505, 30.483], names: ["Eskişehir Osmanqazi Universiteti", "Eskişehir Osmangazi Üniversitesi", "Университет Османгази (Эскишехир)", "Eskişehir Osmangazi University"] },
];

export const AMENITIES: { key: string; icon: string; names: Names }[] = [
  { key: "study_desk", icon: "lamp-desk", names: ["Dərs masası", "Çalışma masası", "Письменный стол", "Study desk"] },
  { key: "wardrobe", icon: "shirt", names: ["Qarderob", "Gardırop", "Шкаф для одежды", "Wardrobe"] },
  { key: "washing_machine", icon: "washing-machine", names: ["Paltaryuyan", "Çamaşır makinesi", "Стиральная машина", "Washing machine"] },
  { key: "fridge", icon: "refrigerator", names: ["Soyuducu", "Buzdolabı", "Холодильник", "Fridge"] },
  { key: "kitchen", icon: "cooking-pot", names: ["Mətbəxdən istifadə", "Mutfak kullanımı", "Доступ к кухне", "Kitchen access"] },
  { key: "dishwasher", icon: "utensils", names: ["Qabyuyan", "Bulaşık makinesi", "Посудомоечная машина", "Dishwasher"] },
  { key: "tv", icon: "tv", names: ["Televizor", "Televizyon", "Телевизор", "TV"] },
  { key: "balcony", icon: "sun", names: ["Eyvan", "Balkon", "Балкон", "Balcony"] },
  { key: "elevator", icon: "arrow-up-down", names: ["Lift", "Asansör", "Лифт", "Elevator"] },
  { key: "intercom", icon: "bell", names: ["Domofon", "Diafon", "Домофон", "Intercom"] },
  { key: "parking", icon: "car", names: ["Parkinq", "Otopark", "Парковка", "Parking"] },
  { key: "new_renovation", icon: "paintbrush", names: ["Yeni təmir", "Yeni tadilat", "Свежий ремонт", "Newly renovated"] },
];

export const PACKAGES = [
  { code: "start", names: ["Start", "Start", "Старт", "Start"] as Names, price: 29, days: 30, limit: 10, slots: 1, sort: 1 },
  { code: "pro", names: ["Peşəkar", "Profesyonel", "Профи", "Professional"] as Names, price: 69, days: 30, limit: 30, slots: 4, sort: 2 },
  { code: "agency", names: ["Agentlik", "Ajans", "Агентство", "Agency"] as Names, price: 149, days: 30, limit: 100, slots: 12, sort: 3 },
];

export function namesOf(n: Names) {
  return { nameAz: n[0], nameTr: n[1], nameRu: n[2], nameEn: n[3] };
}
