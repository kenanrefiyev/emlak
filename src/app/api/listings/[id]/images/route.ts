import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current";
import { addListingImage, reorderListingImages } from "@/server/listings/service";
import { ServiceError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/server/storage/images";

function sameOrigin(req: Request) {
  // Cookie auth + JSON/multipart: reject cross-site requests explicitly.
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

function errorResponse(err: unknown) {
  if (err instanceof ServiceError) {
    const status = err.code === "forbidden" ? 403 : err.code === "not_found" ? 404 : err.code === "rate_limited" ? 429 : 400;
    return NextResponse.json({ error: err.code }, { status });
  }
  console.error("[upload]", err);
  return NextResponse.json({ error: "upload_failed" }, { status: 500 });
}

/** Upload one image (multipart field "file"). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    if (!(await rateLimit(`upload:user:${user.id}`, 60, 3_600_000))) throw new ServiceError("rate_limited");
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw new ServiceError("upload_size");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ServiceError("upload_empty");
    if (file.size > MAX_UPLOAD_BYTES) throw new ServiceError("upload_size");
    const image = await addListingImage(user, id, { buffer: Buffer.from(await file.arrayBuffer()), type: file.type });
    return NextResponse.json({ image }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Reorder: body { order: string[] } */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { order?: unknown };
    if (!Array.isArray(body.order) || !body.order.every((x) => typeof x === "string")) throw new ServiceError("validation");
    await reorderListingImages(user, id, body.order as string[]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

