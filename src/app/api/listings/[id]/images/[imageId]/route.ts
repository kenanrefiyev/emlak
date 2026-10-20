import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current";
import { removeListingImage } from "@/server/listings/service";
import { ServiceError } from "@/server/errors";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; imageId: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, imageId } = await ctx.params;
  try {
    await removeListingImage(user, id, imageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.code }, { status: err.code === "forbidden" ? 403 : err.code === "not_found" ? 404 : 400 });
    }
    console.error("[image delete]", err);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
