import "server-only";
import { db } from "@/server/db";
import { storage } from "@/server/storage/driver";
import { objectKey, processAvatar } from "@/server/storage/images";

/** Replaces the user's profile photo; the previous file is removed after the new one is saved. */
export async function setAvatar(userId: string, file: { buffer: Buffer; type: string }) {
  const processed = await processAvatar(file.buffer, file.type);
  const stored = await storage().put(objectKey("avatars", userId), processed.buffer, processed.mimeType);
  const prev = await db.userProfile.findUnique({ where: { userId }, select: { avatarKey: true, avatarUrl: true } });
  try {
    await db.userProfile.upsert({
      where: { userId },
      create: { userId, avatarKey: stored.key, avatarUrl: stored.url },
      update: { avatarKey: stored.key, avatarUrl: stored.url },
    });
  } catch (err) {
    await storage().remove(stored).catch(() => undefined);
    throw err;
  }
  if (prev?.avatarKey && prev.avatarUrl) await storage().remove({ key: prev.avatarKey, url: prev.avatarUrl }).catch(() => undefined);
  return stored.url;
}

export async function removeAvatar(userId: string) {
  const prev = await db.userProfile.findUnique({ where: { userId }, select: { avatarKey: true, avatarUrl: true } });
  if (!prev?.avatarKey) return;
  await db.userProfile.update({ where: { userId }, data: { avatarKey: null, avatarUrl: null } });
  if (prev.avatarUrl) await storage().remove({ key: prev.avatarKey, url: prev.avatarUrl }).catch(() => undefined);
}
