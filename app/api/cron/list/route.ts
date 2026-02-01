import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  const payload = await withGateway(async ({ request }) => {
    return await request("cron.list", {
      includeDisabled: all ? true : undefined,
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}
