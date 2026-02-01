import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const profile = typeof (json as any)?.profile === "string" ? (json as any).profile : "openclaw";
  const targetId = typeof (json as any)?.targetId === "string" ? (json as any).targetId : undefined;
  const fullPage = Boolean((json as any)?.fullPage);

  const payload = await withGateway(async ({ request }) => {
    return await request("browser.request", {
      method: "POST",
      path: "/screenshot",
      query: { profile },
      body: { targetId, fullPage, type: "png" },
      timeoutMs: 60_000,
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}
