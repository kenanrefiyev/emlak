import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/current";
import { ServiceError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/server/storage/images";
import { removeAvatar, setAvatar } from "@/server/profile";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function errorResponse(err: unknown) {
  if (err instanceof ServiceError) return NextResponse.json({ error: err.code }, { status: err.code === "rate_limited" ? 429 : 400 });
  console.error("[avatar]", err);
  return NextResponse.json({ error: "upload_failed" }, { status: 500 });
}

/** Upload a profile photo (multipart field "file"). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (!(await rateLimit(`avatar:user:${user.id}`, 20, 3_600_000))) throw new ServiceError("rate_limited");
    if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) throw new ServiceError("upload_size");
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw new ServiceError("upload_empty");
    if (file.size > MAX_UPLOAD_BYTES) throw new ServiceError("upload_size");
    const url = await setAvatar(user.id, { buffer: Buffer.from(await file.arrayBuffer()), type: file.type });
    revalidatePath("/[locale]/dashboard", "layout");
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await removeAvatar(user.id);
  revalidatePath("/[locale]/dashboard", "layout");
  return NextResponse.json({ ok: true });
}
