import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function GET() {
  const payload = await withGateway(async ({ request }) => {
    return await request("agents.list", {});
  });

  return NextResponse.json({ ok: true, data: payload });
}
