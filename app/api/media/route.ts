import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get("path") ?? "";
  if (!p) return NextResponse.json({ ok: false, error: "path is required" }, { status: 400 });

  const resolved = path.resolve(p);
  const base = path.resolve(process.env.HOME ?? "", ".openclaw", "media");
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const buf = await readFile(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const ct = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
  return new Response(buf, { headers: { "content-type": ct, "cache-control": "no-store" } });
}
