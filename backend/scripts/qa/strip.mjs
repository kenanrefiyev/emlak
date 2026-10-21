// Puts the first N slices of a mobile screenshot side by side for quick review.
import sharp from "sharp";
const [base, n = "4", out] = process.argv.slice(2);
const files = Array.from({ length: Number(n) }, (_, i) => base.replace(/\.png$/, `_p${i}.jpg`));
const metas = await Promise.all(files.map((f) => sharp(f).metadata()));
const W = metas[0].width, H = Math.max(...metas.map((m) => m.height));
await sharp({ create: { width: (W + 20) * files.length, height: H, channels: 3, background: "#888" } })
  .composite(files.map((f, i) => ({ input: f, left: i * (W + 20), top: 0 })))
  .jpeg({ quality: 70 }).toFile(out);
console.log(out);
