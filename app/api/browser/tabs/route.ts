import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profile = url.searchParams.get("profile") ?? "openclaw";

  const payload = await withGateway(async ({ request }) => {
    return await request("browser.request", {
      method: "GET",
      path: "/tabs",
      query: { profile },
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const profile = typeof (json as any)?.profile === "string" ? (json as any).profile : "openclaw";
  const url = typeof (json as any)?.url === "string" ? (json as any).url : "";

  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });

  const payload = await withGateway(async ({ request }) => {
    return await request("browser.request", {
      method: "POST",
      path: "/tabs/open",
      query: { profile },
      body: { url },
    });
  });

  return NextResponse.json({ ok: true, data: payload });
}
