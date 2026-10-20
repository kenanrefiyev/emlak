import "server-only";
import { db } from "@/server/db";
import { LISTING_TTL_DAYS, ROOMMATE_TTL_DAYS } from "@/lib/domain";

/** Admin-editable platform settings with safe defaults. */
export const SETTING_DEFAULTS = {
  listingTtlDays: LISTING_TTL_DAYS,
  roommateTtlDays: ROOMMATE_TTL_DAYS,
  /** Active (pending + published) listings for students and owners. */
  userListingLimit: 5,
  /** Active listings for agents without an active package. */
  agentFreeListingLimit: 3,
  /** Days a featured slot lasts once an agent applies it. */
  featuredDays: 7,
  /** Public support address (footer, contact page). Empty = hidden. */
  contactEmail: process.env.CONTACT_EMAIL ?? "",
};

export type Settings = typeof SETTING_DEFAULTS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await db.systemSetting.findMany();
  const out: Settings = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (!(row.key in SETTING_DEFAULTS)) continue;
    const key = row.key as SettingKey;
    const def = SETTING_DEFAULTS[key];
    if (typeof def === typeof row.value) (out as Record<string, unknown>)[key] = row.value;
  }
  return out;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  await db.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
