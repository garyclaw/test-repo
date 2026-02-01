import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openclawBin } from "../_lib/openclaw";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");

  try {
    const { stdout } = await execFileAsync(
      openclawBin(),
      ["sessions", "list", "--json", "--limit", String(limit)],
      { maxBuffer: 5 * 1024 * 1024 },
    );

    const data = JSON.parse(stdout);
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
