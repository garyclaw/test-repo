import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openclawBin } from "../../../_lib/openclaw";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function assertAdmin(req: Request) {
  const key = req.headers.get("x-admin-key") ?? "";
  const expected = process.env.GARY_ADMIN_KEY ?? "";
  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const unauth = assertAdmin(req);
  if (unauth) return unauth;

  const { stdout } = await execFileAsync(openclawBin(), ["gateway", "restart"], {
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  return NextResponse.json({ ok: true, stdout });
}
