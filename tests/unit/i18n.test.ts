import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import az from "../../frontend/messages/az.json";
import tr from "../../frontend/messages/tr.json";
import ru from "../../frontend/messages/ru.json";
import en from "../../frontend/messages/en.json";
import { withFallback } from "@/i18n/messages";
import { isLocale, locales } from "@/i18n/routing";

type Json = { [k: string]: Json | string | Json[] | string[] };

function leaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") out.set(prefix, obj);
  else if (Array.isArray(obj)) obj.forEach((v, i) => leaves(v, `${prefix}[${i}]`).forEach((s, k) => out.set(k, s)));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) leaves(v, prefix ? `${prefix}.${k}` : k).forEach((s, key) => out.set(key, s));
  return out;
}

const files = { az, tr, ru, en } as Record<string, Json>;
const base = leaves(az);

describe("translations", () => {
  it("defines exactly four public locales with Azerbaijani first", () => {
    expect(locales).toEqual(["az", "tr", "ru", "en"]);
    expect(isLocale("az")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  for (const [locale, messages] of Object.entries(files)) {
    describe(locale, () => {
      const own = leaves(messages);
      it("has the same keys as az (no missing or extra keys)", () => {
        expect([...own.keys()].filter((k) => !base.has(k))).toEqual([]);
        expect([...base.keys()].filter((k) => !own.has(k))).toEqual([]);
      });
      it("has no empty strings", () => {
        expect([...own.entries()].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
      });
      it("parses every message as valid ICU with the same placeholders as az", () => {
        for (const [key, text] of own) {
          expect(() => new IntlMessageFormat(text, locale), `${locale}:${key}`).not.toThrow();
          const vars = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).filter((v) => v !== "count").sort();
          expect(vars(text), `${locale}:${key}`).toEqual(vars(base.get(key)!));
        }
      });
      if (locale !== "az") {
        it("is not an untranslated copy of az", () => {
          const same = [...own.entries()].filter(([k, v]) => v === base.get(k) && /[əƏ]/.test(v));
          expect(same.map(([k]) => k)).toEqual([]);
        });
      }
    });
  }

  it("falls back to Azerbaijani for a missing key", () => {
    const merged = withFallback({ a: "az-a", nested: { b: "az-b", c: "az-c" } }, { nested: { b: "en-b" } }) as Record<string, Record<string, string>>;
    expect(merged.a).toBe("az-a");
    expect(merged.nested!.b).toBe("en-b");
    expect(merged.nested!.c).toBe("az-c");
  });
});
