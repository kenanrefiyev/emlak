import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { audit } from "@/server/audit";
import { deleteAllSessions } from "@/server/auth/sessions";
import { SETTING_DEFAULTS, setSetting, type SettingKey } from "@/server/settings";
import { fieldErrorsOf, optionalId, requiredInt, requiredText, checkbox, optionalInt } from "@/lib/validation/helpers";
import type { Actor } from "@/server/listings/service";

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new ServiceError("forbidden");
}

// ───────────── users ─────────────

export async function setUserSuspended(admin: Actor, userId: string, suspended: boolean, reason: string) {
  assertAdmin(admin);
  if (userId === admin.id) throw new ServiceError("forbidden");
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new ServiceError("not_found");
  if (target.role === "ADMIN") throw new ServiceError("forbidden");
  if (suspended && reason.trim().length < 3) throw new ServiceError("validation", { reason: "required" });
  await db.user.update({ where: { id: userId }, data: { status: suspended ? "SUSPENDED" : "ACTIVE", suspendedReason: suspended ? reason.trim().slice(0, 500) : null } });
  if (suspended) await deleteAllSessions(userId);
  await audit(admin.id, suspended ? "user.suspend" : "user.unsuspend", "user", userId, { reason: reason.trim().slice(0, 200) || null });
}

/** Role changes between public roles only; ADMIN is granted exclusively via `npm run admin:create`. */
export async function setUserRole(admin: Actor, userId: string, role: string) {
  assertAdmin(admin);
  if (!["USER", "OWNER", "AGENT"].includes(role)) throw new ServiceError("validation", { role: "choice" });
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new ServiceError("not_found");
  if (target.role === "ADMIN") throw new ServiceError("forbidden");
  await db.user.update({
    where: { id: userId },
    data: { role: role as "USER" | "OWNER" | "AGENT", ...(role === "AGENT" ? { agentProfile: { upsert: { create: {}, update: {} } } } : {}) },
  });
  await audit(admin.id, "user.role", "user", userId, { from: target.role, to: role });
}

// ───────────── locations ─────────────

const names = {
  nameAz: requiredText(1, 80),
  nameTr: requiredText(1, 80),
  nameRu: requiredText(1, 80),
  nameEn: requiredText(1, 80),
};
const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "slug" })
  .max(60);
const coord = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(min).max(max).optional());

const schemas = {
  district: z.object({ slug: slugField, ...names, sortOrder: optionalInt(0, 999) }),
  neighborhood: z.object({ slug: slugField, ...names, districtId: z.string().min(1, { error: "required" }), isPopular: checkbox, latitude: coord(39, 42), longitude: coord(48, 51) }),
  metro: z.object({ slug: slugField, ...names, line: z.enum(["RED", "GREEN", "PURPLE"]), districtId: optionalId, latitude: coord(39, 42), longitude: coord(48, 51) }),
  university: z.object({ slug: slugField, ...names, shortName: requiredText(1, 20), districtId: optionalId, nearestMetroId: optionalId, latitude: coord(39, 42), longitude: coord(48, 51) }),
  amenity: z.object({ ...names, key: z.string().regex(/^[a-z_]{2,40}$/, { error: "slug" }), icon: z.string().regex(/^[a-z-]{2,40}$/), sortOrder: optionalInt(0, 999) }),
} as const;

export type LocationKind = keyof typeof schemas;

function parse<K extends LocationKind>(kind: K, raw: Record<string, unknown>): z.infer<(typeof schemas)[K]> {
  const parsed = schemas[kind].safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  return parsed.data as z.infer<(typeof schemas)[K]>;
}

export async function saveReference(admin: Actor, kind: LocationKind, id: string | null, raw: Record<string, unknown>) {
  assertAdmin(admin);
  const data = parse(kind, raw) as Record<string, unknown>;
  for (const k of Object.keys(data)) if (data[k] === undefined) data[k] = null;
  if ("sortOrder" in data && data.sortOrder === null) data.sortOrder = 0;
  try {
    let savedId: string;
    switch (kind) {
      case "district":
        savedId = (id ? await db.district.update({ where: { id }, data: data as never }) : await db.district.create({ data: data as never })).id;
        break;
      case "neighborhood":
        savedId = (id ? await db.neighborhood.update({ where: { id }, data: data as never }) : await db.neighborhood.create({ data: data as never })).id;
        break;
      case "metro":
        savedId = (id ? await db.metroStation.update({ where: { id }, data: data as never }) : await db.metroStation.create({ data: data as never })).id;
        break;
      case "university":
        savedId = (id ? await db.university.update({ where: { id }, data: data as never }) : await db.university.create({ data: data as never })).id;
        break;
      case "amenity":
        savedId = (id ? await db.amenity.update({ where: { id }, data: data as never }) : await db.amenity.create({ data: data as never })).id;
        break;
    }
    await audit(admin.id, `${kind}.${id ? "update" : "create"}`, kind, savedId, { slug: data.slug ?? data.key ?? null });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") throw new ServiceError("validation", { slug: "taken" });
    throw err;
  }
}

/** Deleting reference data is refused while listings or ads still point at it. */
export async function deleteReference(admin: Actor, kind: LocationKind, id: string) {
  assertAdmin(admin);
  try {
    switch (kind) {
      case "district": {
        const used = await db.listing.count({ where: { districtId: id } });
        const children = await db.neighborhood.count({ where: { districtId: id } });
        if (used || children) throw new ServiceError("in_use");
        await db.district.delete({ where: { id } });
        break;
      }
      case "neighborhood":
        await db.neighborhood.delete({ where: { id } });
        break;
      case "metro":
        await db.metroStation.delete({ where: { id } });
        break;
      case "university":
        await db.university.delete({ where: { id } });
        break;
      case "amenity":
        await db.amenity.delete({ where: { id } });
        break;
    }
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("in_use");
  }
  await audit(admin.id, `${kind}.delete`, kind, id);
}

// ───────────── packages & settings ─────────────

const packageSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,30}$/, { error: "slug" }),
  ...names,
  priceAzn: requiredInt(0, 100000),
  durationDays: requiredInt(1, 365),
  listingLimit: requiredInt(1, 10000),
  featuredSlots: requiredInt(0, 1000),
  isActive: checkbox,
  sortOrder: optionalInt(0, 999),
});

export async function savePackage(admin: Actor, id: string | null, raw: Record<string, unknown>) {
  assertAdmin(admin);
  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  const data = { ...parsed.data, sortOrder: parsed.data.sortOrder ?? 0 };
  try {
    const pkg = id ? await db.subscriptionPackage.update({ where: { id }, data }) : await db.subscriptionPackage.create({ data });
    await audit(admin.id, id ? "package.update" : "package.create", "package", pkg.id, { code: data.code, price: data.priceAzn });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") throw new ServiceError("validation", { code: "taken" });
    throw err;
  }
}

export async function saveSettings(admin: Actor, raw: Record<string, unknown>) {
  assertAdmin(admin);
  const schema = z.object({
    listingTtlDays: requiredInt(7, 365),
    roommateTtlDays: requiredInt(7, 180),
    userListingLimit: requiredInt(1, 100),
    agentFreeListingLimit: requiredInt(0, 100),
    featuredDays: requiredInt(1, 60),
    contactEmail: z.union([z.literal(""), z.email({ error: "email" })]),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    await setSetting(key, parsed.data[key] as never);
  }
  await audit(admin.id, "settings.update", "settings", null, parsed.data);
}

export async function setSupportStatus(admin: Actor, id: string, status: "ANSWERED" | "CLOSED") {
  assertAdmin(admin);
  await db.supportMessage.update({ where: { id }, data: { status } });
  await audit(admin.id, `support.${status.toLowerCase()}`, "support_message", id);
}
