/**
 * Seed — safe to re-run.
 *  1. Reference data (districts, neighborhoods, metro, universities, amenities,
 *     packages) is upserted by slug/key; admin edits to names are overwritten
 *     only for rows that still exist in this file.
 *  2. Demo content (users @demo.yuva.test, listings/ads with is_demo = true) is
 *     deleted and recreated. Real (non-demo) rows are never touched.
 * Refuses to run with NODE_ENV=production unless SEED_ALLOW_PRODUCTION=1, and
 * skips demo content entirely when SEED_DEMO=0. With SEED_IF_EMPTY=1 each part
 * runs only while it is missing (reference: no districts yet; demo: no demo
 * listings yet) — the Vercel build (npm run vercel-build) uses this, so later
 * deploys never overwrite admin edits or recreate demo rows under new ids.
 * Demo accounts get SEED_DEMO_PASSWORD if set; otherwise they cannot log in.
 */
import "dotenv/config";
import { readdirSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ListingCategory } from "../generated/prisma/client";
import { AMENITIES, DISTRICTS, METRO, NEIGHBORHOODS, PACKAGES, UNIVERSITIES, namesOf } from "./reference-data";
import { METRO_COORDS, NEIGHBORHOOD_COORDS, UNIVERSITY_COORDS, type LatLng } from "../lib/baku-geo";

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed with NODE_ENV=production. Set SEED_ALLOW_PRODUCTION=1 to seed reference data deliberately.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DAY = 86_400_000;

async function seedReference() {
  for (const d of DISTRICTS) {
    await db.district.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, sortOrder: d.sort, ...namesOf(d.names) },
      update: { sortOrder: d.sort, ...namesOf(d.names) },
    });
  }
  const districts = new Map((await db.district.findMany()).map((d) => [d.slug, d.id]));
  for (const n of NEIGHBORHOODS) {
    const data = { districtId: districts.get(n.district)!, isPopular: Boolean(n.popular), ...namesOf(n.names) };
    await db.neighborhood.upsert({ where: { slug: n.slug }, create: { slug: n.slug, ...data }, update: data });
  }
  for (const m of METRO) {
    await db.metroStation.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, line: m.line, ...namesOf(m.names) },
      update: { line: m.line, ...namesOf(m.names) },
    });
  }
  const metros = new Map((await db.metroStation.findMany()).map((m) => [m.slug, m.id]));
  for (const u of UNIVERSITIES) {
    const data = {
      shortName: u.short,
      districtId: u.district ? districts.get(u.district)! : null,
      nearestMetroId: u.metro ? metros.get(u.metro)! : null,
      ...namesOf(u.names),
    };
    await db.university.upsert({ where: { slug: u.slug }, create: { slug: u.slug, ...data }, update: data });
  }
  // Approximate map coordinates — only filled in where an admin has not set them.
  const fill = async (table: Record<string, LatLng>, update: (slug: string, latitude: number, longitude: number) => Promise<unknown>) => {
    for (const [slug, [latitude, longitude]] of Object.entries(table)) await update(slug, latitude, longitude);
  };
  await fill(METRO_COORDS, (slug, latitude, longitude) => db.metroStation.updateMany({ where: { slug, latitude: null }, data: { latitude, longitude } }));
  await fill(NEIGHBORHOOD_COORDS, (slug, latitude, longitude) => db.neighborhood.updateMany({ where: { slug, latitude: null }, data: { latitude, longitude } }));
  await fill(UNIVERSITY_COORDS, (slug, latitude, longitude) => db.university.updateMany({ where: { slug, latitude: null }, data: { latitude, longitude } }));
  for (const [i, a] of AMENITIES.entries()) {
    const data = { icon: a.icon, sortOrder: i, ...namesOf(a.names) };
    await db.amenity.upsert({ where: { key: a.key }, create: { key: a.key, ...data }, update: data });
  }
  for (const p of PACKAGES) {
    const data = { ...namesOf(p.names), priceAzn: p.price, durationDays: p.days, listingLimit: p.limit, featuredSlots: p.slots, sortOrder: p.sort };
    await db.subscriptionPackage.upsert({ where: { code: p.code }, create: { code: p.code, ...data }, update: {} });
  }
  console.log(`reference: ${DISTRICTS.length} districts, ${NEIGHBORHOODS.length} areas, ${METRO.length} stations, ${UNIVERSITIES.length} universities`);
}

// ───────────── demo content ─────────────

const photos = readdirSync(path.resolve(import.meta.dirname, "../../frontend/public/demo")).filter((f) => f.endsWith(".webp"));
const byGroup = (g: string) => photos.filter((f) => f.startsWith(`${g}-`));

interface DemoListing {
  owner: string;
  category: ListingCategory;
  title: string;
  description: string;
  rent: number;
  perPlace?: boolean;
  deposit?: number;
  commission?: number;
  district: string;
  area?: string;
  metro?: string;
  uni?: string;
  addressPublic: string;
  rooms?: number;
  baths?: number;
  sqm?: number;
  floor?: [number, number];
  residents?: number;
  spaces?: number;
  furnishing?: "FURNISHED" | "PARTLY" | "UNFURNISHED";
  utilities?: "INCLUDED" | "PARTLY" | "NOT_INCLUDED";
  internet?: boolean;
  heating?: "CENTRAL" | "COMBI" | "ELECTRIC" | "NONE";
  ac?: boolean;
  gender?: "ANY" | "FEMALE" | "MALE";
  fromDays: number;
  minMonths: number;
  amenities: string[];
  photos: string[];
  daysAgo: number;
  en?: { title: string; description: string };
  ru?: { title: string; description: string };
  status?: "PUBLISHED" | "PENDING_REVIEW" | "RENTED";
}

const DEMO_USERS = [
  { key: "agent1", name: "Xəzər Əmlak (demo)", role: "AGENT" as const, phone: "+994501110001", company: "Xəzər Əmlak — demo agentlik", verification: "PENDING" as const },
  { key: "agent2", name: "Bakı Kirayə Mərkəzi (demo)", role: "AGENT" as const, phone: "+994551110002", company: "Bakı Kirayə Mərkəzi — demo", verification: "NONE" as const },
  { key: "owner1", name: "Rəna Məmmədova (demo)", role: "OWNER" as const, phone: "+994701110003" },
  { key: "owner2", name: "Elçin Hüseynov (demo)", role: "OWNER" as const, phone: "+994771110004" },
  { key: "s1", name: "Aysel Quliyeva (demo)", role: "USER" as const, hometown: "Gəncə", uni: "bdu", year: 2 },
  { key: "s2", name: "Murad Əliyev (demo)", role: "USER" as const, hometown: "Lənkəran", uni: "adnsu", year: 1 },
  { key: "s3", name: "Nigar Həsənova (demo)", role: "USER" as const, hometown: "Şəki", uni: "unec", year: 3 },
  { key: "s4", name: "Tural Babayev (demo)", role: "USER" as const, hometown: "Quba", uni: "aztu", year: 2 },
  { key: "s5", name: "Leyla Kərimova (demo)", role: "USER" as const, hometown: "Şamaxı", uni: "atu", year: 1 },
  { key: "s6", name: "Kamran Rzayev (demo)", role: "USER" as const, hometown: "Mingəçevir", uni: "azmiu", year: 4 },
  { key: "s7", name: "Səbinə Abbasova (demo)", role: "USER" as const, hometown: "Naxçıvan", uni: "adu", year: 2 },
  { key: "s8", name: "Orxan Nəbiyev (demo)", role: "USER" as const, hometown: "Zaqatala", uni: "bhos", year: 1 },
];

const R = byGroup("room");
const L = byGroup("living");
const K = byGroup("kitchen");
const B = byGroup("bath");
const D = byGroup("dorm");
const BL = byGroup("building");
const pick = (arr: string[], i: number) => arr[i % arr.length]!;

const LISTINGS: DemoListing[] = [
  {
    owner: "owner1", category: "PRIVATE_ROOM", rent: 280, district: "yasamal", area: "elmler-akademiyasi", metro: "elmler-akademiyasi", uni: "bdu",
    title: "BDU-ya yaxın, qız tələbə üçün ayrıca otaq",
    description: "3 otaqlı mənzildə bir otaq boşdur. Evdə iki qız tələbə yaşayır (BDU və AzTU). Otaqda çarpayı, dərs masası və qarderob var. Mətbəx və hamam ortaqdır. Kommunal xərclər bərabər bölünür, internet daxildir. Ev sahibi eyni binada yaşayır.",
    addressPublic: "Elmlər Akademiyası m. yaxınlığı, Z. Xəlilov küç. ətrafı", rooms: 3, baths: 1, sqm: 14, floor: [4, 9], residents: 2, spaces: 1,
    utilities: "PARTLY", internet: true, gender: "FEMALE", fromDays: 5, minMonths: 5, amenities: ["study_desk", "wardrobe", "washing_machine", "fridge", "kitchen"],
    photos: [pick(R, 0), pick(K, 0), pick(B, 0)], daysAgo: 1,
    en: { title: "Private room for a female student near Baku State University", description: "One room is free in a 3-room flat shared by two female students (BSU and AzTU). The room has a bed, study desk and wardrobe. Kitchen and bathroom are shared. Utilities are split equally; internet is included. The landlady lives in the same building." },
  },
  {
    owner: "s2", category: "SHARED_APARTMENT", rent: 220, perPlace: true, district: "nerimanov", area: "genclik", metro: "genclik", uni: "ada",
    title: "Gənclikdə 2 otaqlı evdə 1 yer — oğlan tələbələr",
    description: "2 otaqlı mənzildə hazırda 3 nəfərik, bir yer boşdur. Hamımız ADNSU tələbəsiyik. Ev metroya 5-7 dəqiqəlik piyada yoldadır (öz təcrübəmizə görə). Siqaret evdə çəkilmir. Növbə ilə təmizlik edirik.",
    addressPublic: "Gənclik m. ətrafı, Fətəli xan Xoyski pr. yaxınlığı", rooms: 2, baths: 1, sqm: 60, floor: [7, 12], residents: 3, spaces: 1,
    utilities: "NOT_INCLUDED", internet: true, gender: "MALE", fromDays: 0, minMonths: 4, amenities: ["washing_machine", "fridge", "kitchen", "tv"],
    photos: [pick(L, 0), pick(R, 1), pick(K, 1)], daysAgo: 2,
  },
  {
    owner: "agent1", category: "ENTIRE_APARTMENT", rent: 550, commission: 50, deposit: 550, district: "nesimi", area: "28-may", metro: "28-may", uni: "adnsu",
    title: "28 May metrosu yanında 1 otaqlı mənzil",
    description: "Təzə təmirli 1 otaqlı mənzil, tam əşyalı. İki tələbə üçün uyğundur. Kombi istilik, kondisioner var. Agentlik haqqı ilk ayın kirayəsinin 50%-i qədərdir. Depozit bir aylıq kirayəyə bərabərdir.",
    addressPublic: "28 May m. ətrafı, Nəsimi r.", rooms: 1, baths: 1, sqm: 42, floor: [3, 5],
    heating: "COMBI", ac: true, internet: true, fromDays: 10, minMonths: 6, amenities: ["washing_machine", "fridge", "tv", "new_renovation", "intercom"],
    photos: [pick(L, 1), pick(R, 2), pick(K, 2), pick(B, 1)], daysAgo: 3,
    ru: { title: "1-комнатная квартира у метро 28 Мая", description: "Квартира со свежим ремонтом, полностью меблирована. Подходит для двух студентов. Отопление — комби, есть кондиционер. Комиссия агентства — 50% от первой месячной аренды. Депозит равен месячной аренде." },
  },
  {
    owner: "s1", category: "SHARED_APARTMENT", rent: 250, perPlace: true, district: "yasamal", area: "insaatcilar", metro: "insaatcilar",
    title: "İnşaatçılarda qız tələbələr üçün ortaq ev",
    description: "3 otaqlı evdə 4 qız yaşayırıq, 1 yer boşdur. Otaq iki nəfərlikdir. Sakit, dərsə fikir verən biri axtarırıq. Kommunal xərclər və internet ayda təxminən 30-40 AZN-dir, bərabər bölürük.",
    addressPublic: "İnşaatçılar m. ətrafı, Yasamal r.", rooms: 3, baths: 1, sqm: 75, floor: [2, 9], residents: 4, spaces: 1,
    utilities: "NOT_INCLUDED", internet: true, gender: "FEMALE", fromDays: 14, minMonths: 5, amenities: ["study_desk", "washing_machine", "fridge", "kitchen", "balcony"],
    photos: [pick(R, 3), pick(L, 2), pick(K, 3)], daysAgo: 4,
  },
  {
    owner: "agent2", category: "DORMITORY", rent: 150, perPlace: true, commission: 0, district: "nesimi", area: "nizami-kucesi", metro: "nizami",
    title: "Tələbə hosteli: 4 nəfərlik otaqda çarpayı yeri",
    description: "Mərkəzdə tələbə hosteli. Otaqlar 4 nəfərlikdir, hər kəsin öz şkafı var. Mətbəx, paltaryuyan və iş zalı ortaqdır. Qiymətə kommunal xərclər və internet daxildir. Gecə saat 23:00-dan sonra sakitlik qaydası var.",
    addressPublic: "Nizami m. ətrafı, Nəsimi r.", rooms: 1, residents: 3, spaces: 1, utilities: "INCLUDED", internet: true, gender: "ANY",
    fromDays: 0, minMonths: 1, amenities: ["wardrobe", "washing_machine", "kitchen", "fridge"],
    photos: [pick(D, 0), pick(D, 1), pick(K, 4)], daysAgo: 5,
    en: { title: "Student hostel: a bed in a 4-person room", description: "A student hostel in the city centre. Rooms sleep four; everyone has their own locker. Kitchen, washing machine and a study room are shared. Utilities and internet are included in the price. Quiet hours start at 23:00." },
  },
  {
    owner: "owner2", category: "FAMILY_APARTMENT", rent: 950, deposit: 950, district: "xetai", area: "ehmedli", metro: "ehmedli",
    title: "Əhmədlidə ailə üçün 3 otaqlı mənzil",
    description: "Uzunmüddətli kirayə üçün 3 otaqlı, əşyalı mənzil. Uşaq bağçası və məktəb yaxındadır. Binada lift və domofon var. Yalnız ailəyə verilir. Minimum 12 ay müqavilə ilə.",
    addressPublic: "Əhmədli m. ətrafı, Xətai r.", rooms: 3, baths: 1, sqm: 95, floor: [6, 16],
    heating: "CENTRAL", ac: true, internet: false, fromDays: 20, minMonths: 12, amenities: ["washing_machine", "fridge", "elevator", "intercom", "balcony", "parking"],
    photos: [pick(L, 3), pick(R, 4), pick(K, 5), pick(BL, 0)], daysAgo: 6,
  },
  {
    owner: "owner1", category: "PRIVATE_ROOM", rent: 300, district: "sebail", area: "icerisheher", metro: "icerisheher", uni: "unec",
    title: "UNEC yaxınlığında ev sahibi ilə birgə otaq",
    description: "Təqaüdçü ev sahibinin mənzilində bir otaq kirayə verilir. Tələbə qız və ya oğlan ola bilər, səliqəli və sakit olmaq şərtdir. Kommunal xərclər qiymətə daxildir. Qonaq gecələməsi olmur.",
    addressPublic: "İçərişəhər m. yaxınlığı, Səbail r.", rooms: 2, baths: 1, sqm: 16, floor: [2, 4], residents: 1, spaces: 1,
    utilities: "INCLUDED", internet: true, gender: "ANY", fromDays: 3, minMonths: 6, amenities: ["study_desk", "wardrobe", "fridge", "kitchen"],
    photos: [pick(R, 5), pick(K, 0)], daysAgo: 7,
  },
  {
    owner: "agent1", category: "ENTIRE_APARTMENT", rent: 750, commission: 50, deposit: 750, district: "yasamal", area: "yeni-yasamal", metro: "20-yanvar",
    title: "Yeni Yasamalda 2 otaqlı mənzil — 3 tələbə üçün",
    description: "2 otaqlı, əşyalı mənzil. Üç tələbə üçün rahatdır: bir otaq iki nəfərlik, digəri bir nəfərlik. Mətbəx geniş, qabyuyan var. Agentlik haqqı 50%.",
    addressPublic: "20 Yanvar m. ətrafı, Yeni Yasamal", rooms: 2, baths: 1, sqm: 68, floor: [9, 14],
    heating: "COMBI", internet: true, fromDays: 7, minMonths: 9, amenities: ["washing_machine", "dishwasher", "fridge", "elevator", "intercom"],
    photos: [pick(L, 4), pick(R, 6), pick(K, 1), pick(B, 2)], daysAgo: 8,
  },
  {
    owner: "s3", category: "SHARED_APARTMENT", rent: 260, perPlace: true, district: "sebail", area: "sahil", metro: "sahil", uni: "adpu",
    title: "Sahil metrosu yanında ortaq evdə ayrıca otaq",
    description: "Mən UNEC 3-cü kurs tələbəsiyəm, 2 otaqlı evdə ikinci otaq üçün ev yoldaşı axtarıram. Otaq ayrıcadır, qapısı bağlanır. Ev sakitdir, siqaret çəkilmir.",
    addressPublic: "Sahil m. ətrafı, Səbail r.", rooms: 2, baths: 1, sqm: 55, floor: [3, 5], residents: 1, spaces: 1,
    utilities: "NOT_INCLUDED", internet: true, gender: "FEMALE", fromDays: 25, minMonths: 6, amenities: ["wardrobe", "washing_machine", "fridge", "kitchen"],
    photos: [pick(R, 7), pick(L, 5)], daysAgo: 9,
  },
  {
    owner: "agent2", category: "FAMILY_APARTMENT", rent: 1200, commission: 50, deposit: 1200, district: "nerimanov", area: "nerimanov-metro", metro: "nerimanov",
    title: "Nərimanovda ailə üçün geniş 3 otaqlı mənzil",
    description: "Yeni tikilidə 3 otaqlı, 2 hamamlı mənzil. Tam əşyalı, məişət texnikası var. Uzunmüddətli kirayə, ailəyə üstünlük verilir. Agentlik haqqı 50%.",
    addressPublic: "Nəriman Nərimanov m. ətrafı", rooms: 3, baths: 2, sqm: 120, floor: [11, 17],
    heating: "COMBI", ac: true, internet: true, fromDays: 30, minMonths: 12, amenities: ["washing_machine", "dishwasher", "fridge", "tv", "elevator", "parking", "balcony"],
    photos: [pick(L, 6), pick(R, 8), pick(K, 5), pick(B, 3), pick(BL, 1)], daysAgo: 10,
  },
  {
    owner: "owner2", category: "PRIVATE_ROOM", rent: 230, district: "nizami", area: "koroglu", metro: "koroglu",
    title: "Koroğlu metrosu yaxınlığında sərfəli otaq",
    description: "2 otaqlı mənzildə bir otaq kirayə verilir. Digər otaqda bir tələbə oğlan yaşayır. Metroya yaxındır, ADA və Xəzər universitetlərinə metro ilə getmək rahatdır. Kommunal xərclər ayrıca.",
    addressPublic: "Koroğlu m. ətrafı", rooms: 2, baths: 1, sqm: 13, floor: [5, 9], residents: 1, spaces: 1,
    utilities: "NOT_INCLUDED", internet: true, gender: "MALE", fromDays: 2, minMonths: 3, amenities: ["wardrobe", "fridge", "kitchen"],
    photos: [pick(R, 9), pick(K, 3)], daysAgo: 11,
  },
  {
    owner: "agent1", category: "ENTIRE_APARTMENT", rent: 480, commission: 30, district: "xetai", area: "xetai-metro", metro: "xetai", uni: "bhos",
    title: "Xətai metrosu yanında studiya mənzil",
    description: "Kiçik, təmiz studiya mənzil: yataq hissəsi, mətbəx küncü və hamam. Bir və ya iki nəfər üçün uyğundur. BANM-a yaxındır. Agentlik haqqı 30%.",
    addressPublic: "Şah İsmayıl Xətai m. ətrafı", rooms: 1, baths: 1, sqm: 34, floor: [2, 9],
    heating: "ELECTRIC", ac: true, internet: true, fromDays: 0, minMonths: 6, amenities: ["fridge", "washing_machine", "new_renovation"],
    photos: [pick(R, 10), pick(K, 4), pick(B, 0)], daysAgo: 12,
  },
  {
    owner: "s4", category: "SHARED_APARTMENT", rent: 200, perPlace: true, district: "yasamal", area: "elmler-akademiyasi", metro: "elmler-akademiyasi", uni: "aztu",
    title: "Elmlər Akademiyasında 3 otaqlı evdə 2 yer",
    description: "AzTU tələbələriyik, 3 otaqlı evdə 2 yer boşdur (bir otaq iki nəfərlik). Futbol və oyun sevən, amma dərsə də vaxt ayıran uşaqlar axtarırıq. Kommunal xərclər bərabər bölünür.",
    addressPublic: "Elmlər Akademiyası m. ətrafı", rooms: 3, baths: 1, sqm: 80, floor: [6, 9], residents: 3, spaces: 2,
    utilities: "NOT_INCLUDED", internet: true, gender: "MALE", fromDays: 12, minMonths: 4, amenities: ["washing_machine", "fridge", "kitchen", "tv"],
    photos: [pick(L, 0), pick(R, 11), pick(K, 2)], daysAgo: 13,
  },
  {
    owner: "owner1", category: "FAMILY_APARTMENT", rent: 800, deposit: 800, district: "binegedi", area: "8-mkr", metro: "nesimi",
    title: "8-ci mikrorayonda 2 otaqlı mənzil — ailə üçün",
    description: "Sakit həyətdə 2 otaqlı, orta təmirli mənzil. Mebel qismən var. Məktəb və bazar yaxındır. Uzunmüddətli kirayəçi axtarılır.",
    addressPublic: "Nəsimi m. ətrafı, 8-ci mikrorayon", rooms: 2, baths: 1, sqm: 64, floor: [4, 9],
    furnishing: "PARTLY", heating: "CENTRAL", internet: false, fromDays: 15, minMonths: 12, amenities: ["fridge", "balcony", "intercom"],
    photos: [pick(L, 1), pick(R, 0), pick(BL, 2)], daysAgo: 14,
  },
  {
    owner: "agent2", category: "DORMITORY", rent: 180, perPlace: true, district: "nerimanov", area: "genclik", metro: "genclik",
    title: "Gənclikdə qızlar üçün yataqxana tipli ev",
    description: "Qız tələbələr üçün 2 və 3 nəfərlik otaqlar. Qiymətə kommunal xərclər, internet və həftəlik ümumi təmizlik daxildir. Giriş-çıxış saatı qaydası var.",
    addressPublic: "Gənclik m. ətrafı", rooms: 4, residents: 7, spaces: 2, utilities: "INCLUDED", internet: true, gender: "FEMALE",
    fromDays: 0, minMonths: 1, amenities: ["wardrobe", "washing_machine", "kitchen", "fridge", "study_desk"],
    photos: [pick(D, 2), pick(R, 12), pick(K, 0)], daysAgo: 15,
  },
  {
    owner: "s5", category: "PRIVATE_ROOM", rent: 270, district: "nesimi", metro: "8-noyabr", uni: "atu",
    title: "Tibb Universitetinə yaxın, qız üçün otaq",
    description: "2 otaqlı evdə ikinci otağı kirayə verirəm (ev sahibi ilə razılaşdırılıb). Mən ATU 1-ci kurs tələbəsiyəm. Evdə siqaret çəkilmir, qonaqlar az olur.",
    addressPublic: "8 Noyabr m. ətrafı, Nəsimi r.", rooms: 2, baths: 1, sqm: 12, floor: [3, 5], residents: 1, spaces: 1,
    utilities: "PARTLY", internet: true, gender: "FEMALE", fromDays: 8, minMonths: 5, amenities: ["study_desk", "wardrobe", "fridge", "kitchen"],
    photos: [pick(R, 1), pick(B, 1)], daysAgo: 16,
  },
  {
    owner: "agent1", category: "ENTIRE_APARTMENT", rent: 650, commission: 50, deposit: 650, district: "nerimanov", area: "genclik", metro: "genclik", uni: "ada",
    title: "Gənclik metrosu yaxınlığında 2 otaqlı mənzil",
    description: "2 otaqlı, əşyalı mənzil. ADA Universitetinə yaxın ərazidə. Tələbələrə də, gənc ailəyə də verilir. Agentlik haqqı 50%.",
    addressPublic: "Gənclik m. ətrafı, Əhmədbəy Ağaoğlu küç. yaxınlığı", rooms: 2, baths: 1, sqm: 58, floor: [8, 12],
    heating: "CENTRAL", internet: true, fromDays: 18, minMonths: 6, amenities: ["washing_machine", "fridge", "tv", "elevator"],
    photos: [pick(L, 2), pick(R, 2), pick(K, 3)], daysAgo: 18,
  },
  {
    owner: "owner2", category: "SHARED_APARTMENT", rent: 190, perPlace: true, district: "xetai", area: "hezi-aslanov", metro: "hezi-aslanov",
    title: "Həzi Aslanovda büdcəyə uyğun ortaq ev",
    description: "3 otaqlı evdə 2 yer boşdur. Mərkəzdən uzaqdır, amma qiymət sərfəlidir və metroya yaxındır. Kommunal xərclər ayrıca ödənilir.",
    addressPublic: "Həzi Aslanov m. ətrafı", rooms: 3, baths: 1, sqm: 70, floor: [1, 5], residents: 2, spaces: 2,
    furnishing: "PARTLY", utilities: "NOT_INCLUDED", internet: false, gender: "MALE", fromDays: 4, minMonths: 3, amenities: ["fridge", "kitchen"],
    photos: [pick(L, 3), pick(R, 3)], daysAgo: 20,
  },
  {
    owner: "agent2", category: "FAMILY_APARTMENT", rent: 1400, commission: 50, deposit: 1400, district: "sebail", area: "badamdar", metro: undefined,
    title: "Badamdarda ailə üçün 4 otaqlı mənzil",
    description: "Dəniz mənzərəli, 4 otaqlı mənzil. Ailəyə uzunmüddətli kirayə. Avtomobil üçün parkinq yeri var. İctimai nəqliyyat avtobusla.",
    addressPublic: "Badamdar qəs., Səbail r.", rooms: 4, baths: 2, sqm: 150, floor: [5, 10],
    heating: "COMBI", ac: true, internet: true, fromDays: 30, minMonths: 12, amenities: ["washing_machine", "dishwasher", "fridge", "parking", "balcony", "elevator"],
    photos: [pick(L, 4), pick(R, 4), pick(K, 5), pick(BL, 3)], daysAgo: 21,
  },
  {
    owner: "s6", category: "SHARED_APARTMENT", rent: 240, perPlace: true, district: "yasamal", area: "elmler-akademiyasi", metro: "elmler-akademiyasi", uni: "azmiu",
    title: "AzMİU yanında evdə ev yoldaşı üçün yer",
    description: "4-cü kurs tələbəsiyəm, 2 otaqlı evdə ikinci otağa ev yoldaşı axtarıram. Ev əşyalıdır, internet var. Səhər tezdən dərsə gedirəm, gecələr səs-küy olmasın.",
    addressPublic: "Elmlər Akademiyası m. ətrafı, Ayna Sultanova küç. yaxınlığı", rooms: 2, baths: 1, sqm: 50, floor: [4, 5], residents: 1, spaces: 1,
    utilities: "NOT_INCLUDED", internet: true, gender: "MALE", fromDays: 6, minMonths: 6, amenities: ["wardrobe", "fridge", "kitchen", "washing_machine"],
    photos: [pick(R, 5), pick(L, 5), pick(K, 2)], daysAgo: 22, status: "RENTED",
  },
  {
    owner: "owner1", category: "PRIVATE_ROOM", rent: 260, district: "binegedi", area: "azadliq-prospekti", metro: "azadliq-prospekti",
    title: "Azadlıq prospektində təmiz otaq",
    description: "Ailə ilə yaşadığımız 3 otaqlı mənzildə bir otaq tələbə qıza verilir. Ev yeməyi istəyə görə razılaşdırıla bilər.",
    addressPublic: "Azadlıq prospekti m. ətrafı", rooms: 3, baths: 1, sqm: 12, floor: [3, 9], residents: 3, spaces: 1,
    utilities: "INCLUDED", internet: true, gender: "FEMALE", fromDays: 1, minMonths: 4, amenities: ["wardrobe", "study_desk", "kitchen"],
    photos: [pick(R, 6), pick(K, 1)], daysAgo: 2, status: "PENDING_REVIEW",
  },
];

interface DemoRoommate {
  owner: string;
  type: "HAS_PLACE" | "SEEKING_PARTNER";
  title: string;
  description: string;
  contribution?: number;
  home?: ListingCategory;
  residents?: number;
  spaces?: number;
  district?: string;
  area?: string;
  metro?: string;
  rules?: string;
  budget?: [number, number];
  desired?: ListingCategory;
  group?: number;
  preferred?: string[];
  uni?: string;
  moveIn: number;
  months: number;
  gender: "ANY" | "FEMALE" | "MALE";
  smoking: "NO_SMOKING" | "OUTSIDE_ONLY" | "ALLOWED";
  cleaning: "ROTA" | "EACH_OWN" | "HIRED_HELP" | "FLEXIBLE";
  sleep: "EARLY" | "LATE" | "FLEXIBLE";
  guests: "RARELY" | "SOMETIMES" | "OFTEN";
  daysAgo: number;
}

const ROOMMATES: DemoRoommate[] = [
  {
    owner: "s1", type: "HAS_PLACE", title: "Elmlər Akademiyasında evimə qız ev yoldaşı axtarıram",
    description: "BDU 2-ci kurs tələbəsiyəm. 2 otaqlı evdə yaşayıram, ikinci otaq boşdur. Sakit, səliqəli və dərsə vaxt ayıran birini axtarıram. Həftəsonları çox vaxt Gəncəyə gedirəm.",
    contribution: 260, home: "SHARED_APARTMENT", residents: 1, spaces: 1, district: "yasamal", area: "elmler-akademiyasi", metro: "elmler-akademiyasi", uni: "bdu",
    rules: "Evdə siqaret yoxdur. Gecə 23:00-dan sonra sakitlik. Qonaq gecələməsi əvvəlcədən razılaşdırılır.",
    moveIn: 7, months: 9, gender: "FEMALE", smoking: "NO_SMOKING", cleaning: "ROTA", sleep: "EARLY", guests: "RARELY", daysAgo: 1,
  },
  {
    owner: "s2", type: "SEEKING_PARTNER", title: "Gənclik və ya Nərimanovda birlikdə ev tutaq",
    description: "Lənkərandan gəlmişəm, ADNSU 1-ci kursam. 1-2 nəfərlə birlikdə 2 otaqlı ev tutmaq istəyirəm. Büdcəm adambaşı 200-280 AZN-dir.",
    budget: [200, 280], desired: "ENTIRE_APARTMENT", group: 1, preferred: ["nerimanov", "nesimi"], uni: "adnsu",
    moveIn: 10, months: 9, gender: "MALE", smoking: "NO_SMOKING", cleaning: "ROTA", sleep: "FLEXIBLE", guests: "SOMETIMES", daysAgo: 2,
  },
  {
    owner: "s3", type: "HAS_PLACE", title: "Sahildə otağım var, ev yoldaşı lazımdır",
    description: "UNEC tələbəsiyəm, 2 otaqlı evin bir otağı boşdur. Evdə paltaryuyan, internet var. Kommunal xərcləri yarı bölürük.",
    contribution: 260, home: "SHARED_APARTMENT", residents: 1, spaces: 1, district: "sebail", area: "sahil", metro: "sahil", uni: "unec",
    rules: "Təmizlik növbə ilə. Mətbəxi istifadədən sonra təmiz saxlamaq.",
    moveIn: 25, months: 6, gender: "FEMALE", smoking: "NO_SMOKING", cleaning: "ROTA", sleep: "LATE", guests: "SOMETIMES", daysAgo: 3,
  },
  {
    owner: "s4", type: "SEEKING_PARTNER", title: "Yasamalda 3 nəfərlik ev üçün 1 nəfər axtarırıq",
    description: "İki AzTU tələbəsiyik, üçüncü ev yoldaşı ilə birlikdə 3 otaqlı ev tutmaq istəyirik. Hər kəsin öz otağı olsun deyə düşünürük.",
    budget: [220, 300], desired: "ENTIRE_APARTMENT", group: 2, preferred: ["yasamal", "nesimi"], uni: "aztu",
    moveIn: 14, months: 10, gender: "MALE", smoking: "OUTSIDE_ONLY", cleaning: "ROTA", sleep: "LATE", guests: "OFTEN", daysAgo: 4,
  },
  {
    owner: "s5", type: "SEEKING_PARTNER", title: "Tibb tələbəsi qız, birlikdə kirayə üçün yoldaş axtarıram",
    description: "Şamaxıdanam, ATU 1-ci kursam. 28 May, Nizami və ya Gənclik ətrafında birlikdə ev tutmaq istəyirəm. Səhər dərslərim olduğuna görə erkən yatıram.",
    budget: [200, 260], desired: "SHARED_APARTMENT", group: 1, preferred: ["nesimi", "nerimanov"], uni: "atu",
    moveIn: 12, months: 10, gender: "FEMALE", smoking: "NO_SMOKING", cleaning: "EACH_OWN", sleep: "EARLY", guests: "RARELY", daysAgo: 5,
  },
  {
    owner: "s6", type: "HAS_PLACE", title: "İnşaatçılarda ikinci otaq boşdur",
    description: "AzMİU 4-cü kurs tələbəsiyəm. Evdə ikinci otaq üçün ev yoldaşı axtarıram. Səhər tezdən dərsə və işə gedirəm.",
    contribution: 240, home: "SHARED_APARTMENT", residents: 1, spaces: 1, district: "yasamal", area: "insaatcilar", metro: "insaatcilar", uni: "azmiu",
    rules: "Siqaret yalnız eyvanda. Həftədə bir dəfə birgə təmizlik.",
    moveIn: 6, months: 6, gender: "MALE", smoking: "OUTSIDE_ONLY", cleaning: "ROTA", sleep: "EARLY", guests: "SOMETIMES", daysAgo: 6,
  },
  {
    owner: "s7", type: "SEEKING_PARTNER", title: "Naxçıvandan gəlmiş tələbə qız — ev yoldaşı axtarıram",
    description: "ADU 2-ci kursam. Sakit, kitab oxumağı sevən biriyəm. Nəsimi və ya Yasamal rayonunda birlikdə kirayə ev tapmaq istəyirəm.",
    budget: [180, 250], desired: "SHARED_APARTMENT", group: 1, preferred: ["nesimi", "yasamal"], uni: "adu",
    moveIn: 20, months: 9, gender: "FEMALE", smoking: "NO_SMOKING", cleaning: "FLEXIBLE", sleep: "FLEXIBLE", guests: "RARELY", daysAgo: 7,
  },
  {
    owner: "s8", type: "SEEKING_PARTNER", title: "BANM tələbəsi, Xətai ətrafında ev yoldaşı",
    description: "Zaqatalayam, BANM 1-ci kursam. Xətai və ya Nizami rayonunda 1-2 nəfərlə ev tutmaq istəyirəm. Futbol oynayıram, amma evdə sakitəm.",
    budget: [180, 240], desired: "ENTIRE_APARTMENT", group: 1, preferred: ["xetai", "nizami"], uni: "bhos",
    moveIn: 5, months: 10, gender: "MALE", smoking: "NO_SMOKING", cleaning: "ROTA", sleep: "FLEXIBLE", guests: "SOMETIMES", daysAgo: 8,
  },
  {
    owner: "owner2", type: "HAS_PLACE", title: "Koroğluda otaq — sakit tələbə oğlan",
    description: "Evdə bir tələbə yaşayır, ikinci otaq üçün ev yoldaşı axtarılır. Metro yaxındır.",
    contribution: 230, home: "PRIVATE_ROOM", residents: 1, spaces: 1, district: "nizami", area: "koroglu", metro: "koroglu",
    moveIn: 3, months: 3, gender: "MALE", smoking: "NO_SMOKING", cleaning: "EACH_OWN", sleep: "FLEXIBLE", guests: "SOMETIMES", daysAgo: 10,
  },
  {
    owner: "s3", type: "SEEKING_PARTNER", title: "Yay üçün İçərişəhər ətrafında qısa müddətli ev yoldaşı",
    description: "Yay təcrübəsi üçün Səbail ərazisində 3 aylıq birgə kirayə üçün yoldaş axtarıram.",
    budget: [250, 350], desired: "ENTIRE_APARTMENT", group: 1, preferred: ["sebail"], uni: "unec",
    moveIn: 40, months: 3, gender: "FEMALE", smoking: "NO_SMOKING", cleaning: "ROTA", sleep: "LATE", guests: "SOMETIMES", daysAgo: 12,
  },
];

async function seedDemo() {
  // Remove previous demo content only.
  await db.listing.deleteMany({ where: { isDemo: true } });
  await db.roommateAd.deleteMany({ where: { isDemo: true } });
  await db.user.deleteMany({ where: { email: { endsWith: "@demo.yuva.test" } } });

  const passwordHash = process.env.SEED_DEMO_PASSWORD ? await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12) : "disabled";
  const districts = new Map((await db.district.findMany()).map((d) => [d.slug, d.id]));
  const areas = new Map((await db.neighborhood.findMany()).map((d) => [d.slug, d.id]));
  const metros = new Map((await db.metroStation.findMany()).map((d) => [d.slug, d.id]));
  const unis = new Map((await db.university.findMany()).map((d) => [d.slug, d.id]));
  const amenities = new Map((await db.amenity.findMany()).map((d) => [d.key, d.id]));
  const users = new Map<string, string>();

  for (const u of DEMO_USERS) {
    const created = await db.user.create({
      data: {
        email: `${u.key}@demo.yuva.test`,
        name: u.name,
        phone: "phone" in u ? u.phone : null,
        role: u.role,
        passwordHash,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            hometown: "hometown" in u ? u.hometown : null,
            universityId: "uni" in u ? unis.get(u.uni!) : null,
            studyYear: "year" in u ? u.year : null,
          },
        },
        ...(u.role === "AGENT"
          ? {
              agentProfile: {
                create: {
                  companyName: u.company,
                  businessPhone: u.phone,
                  about: "Demo agentlik hesabıdır. Real şirkət deyil.",
                  verificationStatus: u.verification,
                },
              },
            }
          : {}),
      },
    });
    users.set(u.key, created.id);
    if (u.role === "AGENT" && u.verification === "PENDING") {
      await db.verificationRequest.create({
        data: { applicantId: created.id, message: "Demo sorğu: VÖEN və ofis ünvanı yoxlanış üçün təqdim olunur." },
      });
    }
  }

  const now = Date.now();
  let n = 0;
  // Every listing gets its own cover photo matching its type; supporting
  // photos (kitchen, bathroom, building) rotate through their pools.
  const usedCovers = new Set<string>();
  const cover = (pool: string[]) => {
    const f = pool.find((x) => !usedCovers.has(x)) ?? pool[0]!;
    usedCovers.add(f);
    return f;
  };
  const photosFor = (category: ListingCategory, i: number): string[] => {
    switch (category) {
      case "PRIVATE_ROOM":
        return [cover(R), pick(K, i), pick(B, i)];
      case "SHARED_APARTMENT":
        return [cover(R), pick(L, i + 7), pick(K, i + 2)];
      case "DORMITORY":
        return [cover(D), pick(D, i + 3), pick(K, i + 4)];
      case "ENTIRE_APARTMENT":
        return [cover(L), pick(R, i + 11), pick(K, i + 1), pick(B, i + 1)];
      case "FAMILY_APARTMENT":
        return [cover(L), pick(R, i + 5), pick(K, i + 3), pick(B, i + 2), pick(BL, i)];
    }
  };
  for (const [index, l] of LISTINGS.entries()) {
    l.photos = photosFor(l.category, index);
    const status = l.status ?? "PUBLISHED";
    const published = new Date(now - l.daysAgo * DAY);
    const listing = await db.listing.create({
      data: {
        ownerId: users.get(l.owner)!,
        isDemo: true,
        category: l.category,
        status,
        monthlyRent: l.rent,
        pricePerPlace: l.perPlace ?? (l.category === "PRIVATE_ROOM" || l.category === "DORMITORY"),
        deposit: l.deposit ?? null,
        commissionType: l.commission ? "PERCENT" : "NONE",
        commissionValue: l.commission ?? null,
        districtId: districts.get(l.district)!,
        neighborhoodId: l.area ? areas.get(l.area)! : null,
        metroStationId: l.metro ? metros.get(l.metro)! : null,
        universityId: l.uni ? unis.get(l.uni)! : null,
        addressPublic: l.addressPublic,
        rooms: l.rooms ?? null,
        bathrooms: l.baths ?? null,
        areaSqm: l.sqm ?? null,
        floor: l.floor?.[0] ?? null,
        totalFloors: l.floor?.[1] ?? null,
        residentsCount: l.residents ?? null,
        availableSpaces: l.spaces ?? null,
        furnishing: l.furnishing ?? "FURNISHED",
        utilities: l.utilities ?? "NOT_INCLUDED",
        internet: l.internet ?? false,
        heating: l.heating ?? "CENTRAL",
        airConditioning: l.ac ?? false,
        genderPreference: l.gender ?? "ANY",
        availableFrom: new Date(new Date(now + l.fromDays * DAY).toISOString().slice(0, 10)),
        minDurationMonths: l.minMonths,
        submittedAt: published,
        publishedAt: status === "PENDING_REVIEW" ? null : published,
        expiresAt: status === "PENDING_REVIEW" ? null : new Date(published.getTime() + 60 * DAY),
        rentedAt: status === "RENTED" ? new Date(now - DAY) : null,
        createdAt: published,
        translations: {
          create: [
            { locale: "az", title: l.title, description: l.description, isOriginal: true },
            ...(l.en ? [{ locale: "en" as const, title: l.en.title, description: l.en.description }] : []),
            ...(l.ru ? [{ locale: "ru" as const, title: l.ru.title, description: l.ru.description }] : []),
          ],
        },
        amenities: { create: l.amenities.map((k) => ({ amenityId: amenities.get(k)! })) },
      },
    });
    for (const [i, file] of l.photos.entries()) {
      await db.listingImage.create({
        data: {
          listingId: listing.id,
          storageKey: `demo/${listing.id}-${i}.webp`,
          url: `/demo/${file}`,
          width: 1600,
          height: 1067,
          sizeBytes: 0,
          mimeType: "image/webp",
          position: i,
        },
      });
    }
    n++;
  }

  // One demo featured listing, created by the system (source ADMIN).
  const featured = await db.listing.findFirst({ where: { isDemo: true, status: "PUBLISHED", category: "ENTIRE_APARTMENT" }, orderBy: { createdAt: "desc" } });
  if (featured) {
    await db.featuredListing.create({ data: { listingId: featured.id, source: "ADMIN", startsAt: new Date(now - DAY), endsAt: new Date(now + 6 * DAY) } });
  }

  for (const r of ROOMMATES) {
    const published = new Date(now - r.daysAgo * DAY);
    await db.roommateAd.create({
      data: {
        ownerId: users.get(r.owner)!,
        isDemo: true,
        type: r.type,
        status: "PUBLISHED",
        title: r.title,
        description: r.description,
        monthlyContribution: r.contribution ?? null,
        accommodationType: r.home ?? null,
        currentResidents: r.residents ?? null,
        availableSpaces: r.spaces ?? null,
        districtId: r.district ? districts.get(r.district)! : null,
        neighborhoodId: r.area ? areas.get(r.area)! : null,
        metroStationId: r.metro ? metros.get(r.metro)! : null,
        houseRules: r.rules ?? null,
        budgetMin: r.budget?.[0] ?? null,
        budgetMax: r.budget?.[1] ?? null,
        desiredPropertyType: r.desired ?? null,
        groupSize: r.group ?? null,
        universityId: r.uni ? unis.get(r.uni)! : null,
        moveInDate: new Date(new Date(now + r.moveIn * DAY).toISOString().slice(0, 10)),
        durationMonths: r.months,
        genderPreference: r.gender,
        smoking: r.smoking,
        cleaning: r.cleaning,
        sleepSchedule: r.sleep,
        guests: r.guests,
        submittedAt: published,
        publishedAt: published,
        expiresAt: new Date(published.getTime() + 30 * DAY),
        createdAt: published,
        preferredDistricts: { create: (r.preferred ?? []).map((slug) => ({ districtId: districts.get(slug)! })) },
      },
    });
  }
  console.log(`demo: ${DEMO_USERS.length} users, ${n} listings, ${ROOMMATES.length} roommate ads (${photos.length} photos)`);
  if (passwordHash === "disabled") console.log("demo accounts cannot log in (set SEED_DEMO_PASSWORD to enable)");
}

async function main() {
  const onlyIfEmpty = process.env.SEED_IF_EMPTY === "1";
  if (onlyIfEmpty && (await db.district.count()) > 0) console.log("reference data already present — skipping");
  else await seedReference();
  if (process.env.SEED_DEMO === "0") return;
  if (onlyIfEmpty && (await db.listing.count({ where: { isDemo: true } })) > 0) {
    console.log("demo content already present — skipping");
    return;
  }
  if (!photos.length) console.warn("frontend/public/demo is empty — run `npm run photos:fetch` first for demo photos");
  await seedDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
