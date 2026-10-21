import type { AppLocale } from "./routing";
import az from "../messages/az.json";

export type Messages = typeof az;
type Json = { [key: string]: Json | string };

/** Deep-merges `override` onto `base` so a key missing in tr/ru/en falls back to az. */
export function withFallback(base: Json, override: Json): Json {
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] =
      typeof value === "object" && !Array.isArray(value) && typeof baseValue === "object" && !Array.isArray(baseValue) ? withFallback(baseValue, value) : value;
  }
  return out;
}

const loaders: Record<AppLocale, () => Promise<{ default: Json }>> = {
  az: async () => ({ default: az as unknown as Json }),
  tr: () => import("../messages/tr.json") as unknown as Promise<{ default: Json }>,
  ru: () => import("../messages/ru.json") as unknown as Promise<{ default: Json }>,
  en: () => import("../messages/en.json") as unknown as Promise<{ default: Json }>,
};

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const own = (await loaders[locale]()).default;
  if (locale === "az") return own as unknown as Messages;
  return withFallback(az as unknown as Json, own) as unknown as Messages;
}
