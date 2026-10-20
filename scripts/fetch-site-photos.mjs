// Downloads the site-wide photos (hero, info sections, district cards) into
// public/images/ and writes docs/image-assets.json with each file's source,
// author, licence and final size. All photos are from Unsplash under the
// Unsplash License (free to use, no attribution required — credited anyway).
// They are illustrative stock photos, not photos of listed properties.
// Usage: npm run photos:site   (add --force to re-download existing files)
import { mkdir, writeFile, access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DEMO_PHOTOS } from "./fetch-demo-photos.mjs";

const LICENSE = { name: "Unsplash License", url: "https://unsplash.com/license" };

/** width = output width; the CDN never upscales, so smaller originals stay as-is. */
export const SITE_PHOTOS = [
  {
    file: "roomhub-hero-apartment.jpg",
    use: "Home page hero (full-bleed, sizes=100vw)",
    id: "1779903726785-7cf25bed78f7",
    page: "https://unsplash.com/photos/contemporary-dining-area-overlooking-the-beach-and-ocean-W3MckxPY6Mo",
    author: "Caroline Badran",
    location: "Not Baku — illustrative apartment interior",
    width: 3840,
    quality: 82,
  },
  {
    file: "lifestyle-living-room-01.jpg",
    use: "Home page safety section (portrait, fills the 5:6 frame without upscaling)",
    id: "1772797583328-f83bc3f94f80",
    page: "https://unsplash.com/photos/modern-living-room-with-natural-light-and-wooden-accents-2cfj0Y5ch00",
    author: "Puscas Adryan",
    location: "Ksamil, Albania — illustrative interior",
    width: 1800,
    quality: 84,
  },
  {
    file: "apartment-bedroom-01.jpg",
    use: "Sign-in / sign-up side panel",
    id: "1756199622314-189b113a6e3d",
    page: "https://unsplash.com/photos/two-beds-in-a-bright-modern-bedroom-with-large-windows-JJPJezr_rhg",
    author: "Fazeel PH",
    location: "United Arab Emirates",
    width: 2000,
  },
  // District cards — every one verified on its Unsplash page as taken in Baku.
  {
    file: "district-sebail-02.jpg",
    use: "District card: Səbail",
    id: "1746382320435-e91e4cc0219b",
    page: "https://unsplash.com/photos/the-maiden-tower-stands-tall-in-the-bright-sun-s-K48J3BWcc",
    author: "Zulfugar Karimov",
    location: "Maiden Tower, İçərişəhər, Baku",
    width: 1600,
  },
  {
    file: "district-nerimanov-02.jpg",
    use: "District card: Nərimanov",
    id: "1666365452553-6be64f8eac59",
    page: "https://unsplash.com/photos/a-building-with-glass-windows-lTe5nmHWTts",
    author: "İltun Huseynli",
    location: "Heydar Aliyev Center, Baku",
    width: 1600,
  },
  {
    file: "district-nesimi.jpg",
    use: "District card: Nəsimi",
    id: "1747285726261-d14a2fe9450f",
    page: "https://unsplash.com/photos/cars-are-parked-in-front-of-a-grand-building-achTzEHXvLk",
    author: "rishi",
    location: "Central Baku",
    width: 1200,
  },
  {
    file: "district-yasamal.jpg",
    use: "District card: Yasamal",
    id: "1737619954413-5f43fa6a25d9",
    page: "https://unsplash.com/photos/a-large-brown-building-sitting-on-the-side-of-a-road-9RoLnLJZdVo",
    author: "Vikas Shetty",
    location: "Baku",
    width: 1200,
  },
  {
    file: "district-xetai.jpg",
    use: "District card: Xətai",
    id: "1773389061450-eed91161f14d",
    page: "https://unsplash.com/photos/red-car-drives-past-modern-apartment-buildings--idQer1Lh0k",
    author: "Silver Ringvee",
    location: "Baku",
    width: 1200,
  },
  {
    file: "district-nizami.jpg",
    use: "District card: Nizami",
    id: "1747285726502-0ecad7298221",
    page: "https://unsplash.com/photos/elegant-buildings-line-a-quiet-sunlit-street-I0pNd4UkgGw",
    author: "rishi",
    location: "Baku",
    width: 1200,
  },
  {
    file: "district-binegedi.jpg",
    use: "District card: Binəqədi",
    id: "1753161140588-664024dc390b",
    page: "https://unsplash.com/photos/beautiful-building-with-balconies-against-a-blue-sky-bA8vwOAIWUg",
    author: "Nicat Almemmedov",
    location: "Baku",
    width: 1200,
  },
];

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public/images");
const manifestFile = path.join(root, "docs/image-assets.json");
const force = process.argv.includes("--force");

const exists = (f) => access(f).then(() => true, () => false);
const cdn = (id, w) => `https://images.unsplash.com/photo-${id}?w=${w}&q=90&fm=jpg&fit=max`;

async function main() {
  await mkdir(outDir, { recursive: true });
  const site = [];
  for (const p of SITE_PHOTOS) {
    const file = path.join(outDir, p.file);
    if (force || !(await exists(file))) {
      const res = await fetch(cdn(p.id, p.width));
      if (!res.ok) throw new Error(`${p.file}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const jpg = await sharp(buf).rotate().jpeg({ quality: p.quality ?? 80, mozjpeg: true, progressive: true }).toBuffer();
      await writeFile(file, jpg);
    }
    const meta = await sharp(file).metadata();
    const { size } = await stat(file);
    console.log(`${p.file} ${meta.width}x${meta.height} ${(size / 1024).toFixed(0)} KB`);
    site.push({
      file: `public/images/${p.file}`,
      use: p.use,
      width: meta.width,
      height: meta.height,
      bytes: size,
      source: p.page,
      author: p.author,
      ...(p.location ? { location: p.location } : {}),
      license: LICENSE,
    });
  }

  // The demo listing photos (scripts/fetch-demo-photos.mjs) are recorded too.
  const demoFiles = new Set(await readdir(path.join(root, "public/demo")).catch(() => []));
  const demo = Object.entries(DEMO_PHOTOS).flatMap(([group, ids]) =>
    ids
      .map((id) => `${group}-${id}.webp`)
      .filter((f) => demoFiles.has(f))
      .map((f) => ({ file: `public/demo/${f}`, source: cdn(f.slice(f.indexOf("-") + 1, -5), 1600), license: LICENSE })),
  );

  await writeFile(
    manifestFile,
    JSON.stringify(
      {
        note: "Illustrative stock photography. None of these photos show a real listed property; demo listings are flagged is_demo.",
        generatedBy: "scripts/fetch-site-photos.mjs",
        site,
        demoListings: demo,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${site.length} site photos, ${demo.length} demo photos → docs/image-assets.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
