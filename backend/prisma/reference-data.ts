// Reference data for Baku. Station list per the Baku Metro station list (27 open
// stations, 3 lines). Station→district links are intentionally left empty and
// neighborhood→district links are given only where well known. University
// district and nearest metro follow the main campus position in OpenStreetMap
// (see UNIVERSITY_COORDS in backend/lib/baku-geo.ts); admins can correct
// everything in /admin (Ərazilər, Metro, Universitetlər).

type Names = [az: string, tr: string, ru: string, en: string];

export const DISTRICTS: { slug: string; names: Names; sort: number }[] = [
  { slug: "yasamal", names: ["Yasamal", "Yasamal", "Ясамал", "Yasamal"], sort: 1 },
  { slug: "nesimi", names: ["Nəsimi", "Nesimi", "Насими", "Nasimi"], sort: 2 },
  { slug: "nerimanov", names: ["Nərimanov", "Nerimanov", "Нариманов", "Narimanov"], sort: 3 },
  { slug: "sebail", names: ["Səbail", "Sebail", "Сабаил", "Sabail"], sort: 4 },
  { slug: "xetai", names: ["Xətai", "Hatai", "Хатаи", "Khatai"], sort: 5 },
  { slug: "nizami", names: ["Nizami", "Nizami", "Низами", "Nizami"], sort: 6 },
  { slug: "binegedi", names: ["Binəqədi", "Binegedi", "Бинагади", "Binagadi"], sort: 7 },
  { slug: "sabuncu", names: ["Sabunçu", "Sabunçu", "Сабунчу", "Sabunchu"], sort: 8 },
  { slug: "suraxani", names: ["Suraxanı", "Suraxanı", "Сураханы", "Surakhani"], sort: 9 },
  { slug: "xezer", names: ["Xəzər", "Hazar", "Хазар", "Khazar"], sort: 10 },
  { slug: "qaradag", names: ["Qaradağ", "Karadağ", "Гарадаг", "Garadagh"], sort: 11 },
  { slug: "pirallahi", names: ["Pirallahı", "Pirallahı", "Пираллахи", "Pirallahi"], sort: 12 },
];

export const NEIGHBORHOODS: { slug: string; district: string; names: Names; popular?: boolean }[] = [
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

export const UNIVERSITIES: { slug: string; short: string; district?: string; metro?: string; names: Names }[] = [
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
