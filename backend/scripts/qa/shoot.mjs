// Full-page screenshots with system Chrome. Usage:
// node scripts/qa/shoot.mjs <outDir> <width> <url> [url...]
import { chromium } from "playwright-core";
import path from "node:path";

const [outDir, width, ...urls] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1, isMobile: Number(width) < 768 });
if (process.env.SESSION) await ctx.addCookies([{ name: "yuva_session", value: process.env.SESSION, domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
for (const url of urls) {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.addStyleTag({ content: ".wow,[data-wow-delay]{visibility:visible!important;opacity:1!important;animation:none!important}#preload,.preload{display:none!important}" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  const name = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 80) + `_${width}.png`;
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(name, "scrollWidth", sw);
}
if (errors.length) console.log("console errors:", errors.slice(0, 10));
await browser.close();
