import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Prisma.InputJsonValue,
  tx: Prisma.TransactionClient = db,
) {
  await tx.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
}
