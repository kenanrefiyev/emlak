// Slices a tall screenshot into viewport-height JPEG parts for review.
import sharp from "sharp";
const [file, h = "1000"] = process.argv.slice(2);
const meta = await sharp(file).metadata();
const H = Number(h);
const out = [];
for (let top = 0, i = 0; top < meta.height; top += H, i++) {
  const height = Math.min(H, meta.height - top);
  const name = file.replace(/\.png$/, `_p${i}.jpg`);
  await sharp(file).extract({ left: 0, top, width: meta.width, height }).jpeg({ quality: 70 }).toFile(name);
  out.push(name);
}
console.log(meta.width, meta.height, out.length);
console.log(out.join("\n"));
