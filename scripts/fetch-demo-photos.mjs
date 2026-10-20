// Downloads the demo photo set used by prisma/seed.ts into public/demo/.
// Source: Unsplash (Unsplash License — free to use, no attribution required;
// credited in README anyway). These are DEMO images, not photos of real listings.
// Usage: npm run photos:fetch
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const DEMO_PHOTOS = {
  room: [
    "1633948393301-d43e3ec0e5cd",
    "1632119289059-793dd347950f",
    "1463620910506-d0458143143e",
    "1615874959474-d609969a20ed",
    "1696762932825-2737db830bbe",
    "1633944095397-878622ebc01c",
    "1595526114035-0d45ed16cfbf",
    "1719569332255-030dd517952f",
    "1585128792103-0b591f96512e",
    "1531835551805-16d864c8d311",
    "1552558636-f6a8f071c2b3",
    "1774578342100-f779e988c83d",
    "1541004995602-b3e898709909",
    "1765464184843-105e144bd54b",
    "1744974256549-8ece7cdb5dd2",
    "1781249144235-7dff19f6e7db",
    "1786886393825-a2aff98f5f0a",
    "1734599505058-6653a0d8d3ff",
    "1781249144056-ec397e444dfa",
    "1734599511415-cb4a52aea2fe",
    "1758060215425-303300b1c7e2",
    "1776348065117-02285a905b0b",
    "1774161321754-439bd8613f56",
    "1619810230359-b2c2f61c49cd",
    "1512918728675-ed5a9ecdebfd",
  ],
  living: [
    "1522708323590-d24dbb6b0267",
    "1502672260266-1c1ef2d93688",
    "1583847268964-b28dc8f51f92",
    "1665249934445-1de680641f50",
    "1612419299101-6c294dc2901d",
    "1619989652700-9984844cb0ea",
    "1613575831056-0acd5da8f085",
    "1560448204-e02f11c3d0e2",
    "1564078516393-cf04bd966897",
    "1628592102751-ba83b0314276",
    "1763827513396-5917fc6c84f3",
    "1776482128012-a47f853abd57",
    "1615800002234-05c4d488696c",
    "1633505899118-4ca6bd143043",
    "1656122381069-9ec666d95cf1",
    "1609081144289-eacc3108cd03",
    "1781249144562-e15ab4c9f63c",
    "1713832139688-79676097edde",
  ],
  kitchen: [
    "1609241506098-80fc37c6325f",
    "1574739782594-db4ead022697",
    "1593853761096-d0423b545cf9",
    "1702014862053-946a122b920d",
    "1722942115826-13208bc3f8c5",
    "1721522000055-795cf74e9856",
    "1757387240036-d7eb9b096c40",
    "1484154218962-a197022b5858",
  ],
  bath: ["1584622650111-993a426fbf0a", "1631889993959-41b4e9c6e3c5", "1661107259637-4e1c55462428", "1576698483491-8c43f0862543"],
  dorm: ["1555854877-bab0e564b8d5", "1709805619372-40de3f158e83", "1781415980730-bfcf192e38bc",
    "1721743169043-dda0212ce3d4",
    "1723258343563-7d71a55d6dfa",
    "1636917754428-60ece5e521df",
  ],
  building: ["1545324418-cc1a3fa10c00", "1592276040264-e10344a6a10e", "1571236673892-13d222da2019", "1610286986642-057ece0c3656",
    "1753161140588-664024dc390b",
    "1773389061450-eed91161f14d",
    "1737619954413-5f43fa6a25d9",
    "1746616654126-35bd7feb0a38",
    "1602485487042-e5e9b528c389",
    "1782297247938-bfc51277b82f",
    "1565363887715-8884629e09ee",
  ],
  city: [
    "1596306499398-8d88944a5ec4",
    "1596306499300-0b7b1689b9f6",
    "1785608149335-fa1cd223097c",
    "1744704015980-9842c2314c43",
    "1743586652972-0f8994efe810",
    "1616701639706-a89d1a609eda",
    "1595980542930-9eea66620834",
    "1622314621630-0d24bcb5aa67",
    "1624367264208-d887b5536a62",
    "1642856761437-5b5efcb36d81",
    "1608315172253-d6d45356d03a",
    "1716758519404-cabca37863b3",
    "1676302940300-dd9fd542bf0f",
    "1747285726261-d14a2fe9450f",
    "1747285726502-0ecad7298221",
  ],
};

const outDir = path.resolve(import.meta.dirname, "../public/demo");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let done = 0;
  for (const [group, ids] of Object.entries(DEMO_PHOTOS)) {
    for (const id of ids) {
      const file = path.join(outDir, `${group}-${id}.webp`);
      if (await exists(file)) {
        done++;
        continue;
      }
      const url = `https://images.unsplash.com/photo-${id}?w=1600&q=80&fm=jpg&fit=max`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`skip ${id}: HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const webp = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      await writeFile(file, webp);
      done++;
      console.log(`${group}/${id} ${(webp.byteLength / 1024).toFixed(0)} KB`);
    }
  }
  console.log(`${done} demo photos in public/demo`);
}

// Only run when executed directly; fetch-site-photos.mjs imports DEMO_PHOTOS.
if (import.meta.filename === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
