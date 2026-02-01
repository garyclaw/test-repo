import { NextResponse } from "next/server";
import { withGateway } from "../_lib/gateway";

export const runtime = "nodejs";

export async function GET() {
  const payload = await withGateway(async ({ request }) => {
    return await request("status", {});
  });

  // Preserve the UI contract (it expects a string in `stdout`).
  const stdout = JSON.stringify(payload, null, 2);
  return NextResponse.json({ ok: true, stdout, data: payload });
}
