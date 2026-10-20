import "server-only";
import { db } from "@/server/db";

/**
 * Database-backed sliding window. Returns true when the action is allowed and
 * records the hit. Good enough for a single region; swap for Redis at scale.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) return false;
  await db.rateLimitHit.create({ data: { key } });
  // Opportunistic cleanup of old rows (1% of calls).
  if (Math.random() < 0.01) {
    await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  }
  return true;
}

export async function clearRateLimit(key: string) {
  await db.rateLimitHit.deleteMany({ where: { key } });
}
