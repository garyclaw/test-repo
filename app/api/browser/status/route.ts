import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profile = url.searchParams.get("profile") ?? "openclaw";

  const payload = await withGateway(async ({ request }) => {
    return await request("browser.request", {
      method: "GET",
      path: "/",
      query: { profile },
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}
