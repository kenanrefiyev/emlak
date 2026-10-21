import { readLocalObject } from "@/server/storage/driver";

// Serves files written by the local storage driver. Keys are validated against
// a strict pattern (no traversal); only WebP output of the image pipeline lives here.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  try {
    const body = await readLocalObject(key);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
