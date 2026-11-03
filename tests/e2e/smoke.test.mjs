// Browser smoke tests against a running app (default http://localhost:3400).
// Run: BASE_URL=http://localhost:3400 npm run test:e2e
// Uses the system Chrome through playwright-core (CHROME_PATH to override).
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3400";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
let browser;

before(async () => {
  browser = await chromium.launch({ executablePath: CHROME });
});
after(async () => browser?.close());

async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1440, height: 900 }, isMobile: (opts.width ?? 1440) < 768 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  return { p, ctx, errors };
}

const RAW_KEY = /⟨[a-zA-Z.]+⟩|\b(?:home|nav|common|search|listing|card)\.[a-z][A-Za-z]+\b/;

describe("localisation", () => {
  it("sends new visitors to Azerbaijani regardless of Accept-Language", async () => {
    const ctx = await browser.newContext({ locale: "ru-RU", extraHTTPHeaders: { "Accept-Language": "ru-RU,ru;q=0.9" } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`);
    assert.match(new URL(p.url()).pathname, /^\/az\/?$/);
    assert.equal(await p.getAttribute("html", "lang"), "az");
    await ctx.close();
  });

  for (const [locale, word] of [
    ["az", "Tələbə evləri"],
    ["tr", "Öğrenci evleri"],
    ["ru", "Жильё для студентов"],
    ["en", "Student homes"],
  ]) {
    it(`renders ${locale} with translated navigation and no raw keys`, async () => {
      const { p, ctx, errors } = await page();
      const res = await p.goto(`${BASE}/${locale}`);
      assert.equal(res.status(), 200);
      assert.equal(await p.getAttribute("html", "lang"), locale);
      const text = await p.locator("body").innerText();
      assert.ok(text.includes(word), `missing "${word}"`);
      assert.doesNotMatch(text, RAW_KEY);
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }

  it("switching language keeps the page and its filters, and the choice is remembered", async () => {
    const { p, ctx } = await page();
    await p.goto(`${BASE}/az/evler?district=yasamal&max=300`);
    // The switcher is a client component: wait until React has hydrated it.
    const trigger = 'header button[aria-label^="Dil:"]';
    await p.waitForFunction((sel) => Object.keys(document.querySelector(sel) ?? {}).some((k) => k.startsWith("__react")), trigger);
    await p.locator(trigger).first().click();
    await p.locator('header li button[lang="en"]').first().click();
    await p.waitForURL(/\/en\/housing/);
    const url = new URL(p.url());
    assert.equal(url.searchParams.get("district"), "yasamal");
    assert.equal(url.searchParams.get("max"), "300");
    assert.equal(await p.getAttribute("html", "lang"), "en");
    await p.goto(`${BASE}/`);
    assert.match(new URL(p.url()).pathname, /^\/en\/?$/);
    await ctx.close();
  });

  it("old route URLs permanently redirect to the localized ones, keeping filters", async () => {
    const res = await fetch(`${BASE}/az/students?district=yasamal`, { redirect: "manual" });
    assert.equal(res.status, 308);
    assert.match(res.headers.get("location") ?? "", /\/az\/evler\?district=yasamal$/);
  });

  it("prices are identical across languages", async () => {
    const { p, ctx } = await page();
    const prices = {};
    for (const l of ["az", "en", "ru"]) {
      await p.goto(`${BASE}/${l}/${l === "az" ? "evler" : "housing"}?sort=price_asc`);
      prices[l] = (await p.locator("article .t-price").first().innerText()).replace(/\D/g, "");
    }
    assert.equal(prices.az, prices.en);
    assert.equal(prices.az, prices.ru);
    await ctx.close();
  });

  it("admin login is always Azerbaijani, even with another public locale remembered", async () => {
    const { p, ctx } = await page();
    await p.goto(`${BASE}/en`);
    await p.goto(`${BASE}/admin`);
    assert.match(p.url(), /\/admin\/giris/);
    assert.equal(await p.getAttribute("html", "lang"), "az");
    assert.ok((await p.locator("body").innerText()).includes("Admin girişi"));
    await ctx.close();
  });
});

describe("access control", () => {
  it("redirects anonymous users away from private pages", async () => {
    const { p, ctx } = await page();
    await p.goto(`${BASE}/az/account/listings`);
    assert.match(p.url(), /\/az\/login/);
    await p.goto(`${BASE}/en/agent`);
    assert.match(p.url(), /\/en\/login/);
    await ctx.close();
  });

  it("rejects uploads without a session", async () => {
    const res = await fetch(`${BASE}/api/listings/abcdefghijklmnop/images`, { method: "POST", body: new FormData() });
    assert.equal(res.status, 401);
  });

  it("returns 404 for unknown listings and paths", async () => {
    assert.equal((await fetch(`${BASE}/az/listings/doesnotexist123`)).status, 404);
    assert.equal((await fetch(`${BASE}/tr/no-such-page`)).status, 404);
  });
});

describe("SEO", () => {
  it("publishes hreflang alternates and a canonical", async () => {
    const html = await (await fetch(`${BASE}/ru/housing`)).text();
    for (const l of ["az", "tr", "ru", "en", "x-default"]) assert.match(html, new RegExp(`hreflang="${l}"`, "i"));
    assert.match(html, /rel="canonical" href="[^"]*\/ru\/housing"/);
  });

  it("serves robots.txt and a localised sitemap without private pages", async () => {
    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    assert.match(robots, /Disallow: \/admin/);
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    assert.match(sitemap, /\/tr\/evler/);
    assert.match(sitemap, /\/az\/listings\//);
    assert.doesNotMatch(sitemap, /\/account|\/admin|\/agent\b/);
  });
});

describe("responsive layout", () => {
  for (const path of ["/az", "/az/evler", "/ru/roommates", "/en/areas", "/tr/login"]) {
    it(`has no horizontal overflow at 375px: ${path}`, async () => {
      const { p, ctx } = await page({ width: 375 });
      await p.goto(`${BASE}${path}`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `overflow ${overflow}px`);
      await ctx.close();
    });
  }

  it("the mobile menu opens and navigates", async () => {
    const { p, ctx } = await page({ width: 375 });
    await p.goto(`${BASE}/az`);
    await p.getByRole("button", { name: "Menyu" }).click();
    const dialog = p.locator("dialog[open]");
    await dialog.getByRole("link", { name: "Ev yoldaşı tap" }).click();
    await p.waitForURL(/\/az\/ev-yoldasi/);
    await ctx.close();
  });
});
