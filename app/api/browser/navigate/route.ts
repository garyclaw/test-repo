import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const profile = typeof (json as any)?.profile === "string" ? (json as any).profile : "openclaw";
  const targetId = typeof (json as any)?.targetId === "string" ? (json as any).targetId : undefined;
  const url = typeof (json as any)?.url === "string" ? (json as any).url : "";

  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });

  const payload = await withGateway(async ({ request }) => {
    return await request("browser.request", {
      method: "POST",
      path: "/navigate",
      query: { profile },
      body: { url, targetId },
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}
