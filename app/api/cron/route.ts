import { NextResponse } from "next/server";
import { z } from "zod";
import { withGateway } from "../_lib/gateway";

export const runtime = "nodejs";

function assertAdmin(req: Request) {
  const key = req.headers.get("x-admin-key") ?? "";
  const expected = process.env.GARY_ADMIN_KEY ?? "";
  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  const payload = await withGateway(async ({ request }) => {
    return await request("cron.list", {
      includeDisabled: all ? true : undefined,
    });
  });

  const p = payload as { jobs?: unknown };
  const jobs = Array.isArray(p?.jobs) ? p.jobs : [];
  return NextResponse.json({ ok: true, data: { ...p, jobs } });
}

const ActionSchema = z.object({
  action: z.enum(["enable", "disable", "run", "remove"]),
  id: z.string().min(1),
});

export async function POST(req: Request) {
  const unauth = assertAdmin(req);
  if (unauth) return unauth;

  const json = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action, id } = parsed.data;

  const payload = await withGateway(async ({ request }) => {
    if (action === "enable") {
      return await request("cron.update", { jobId: id, patch: { enabled: true } });
    }
    if (action === "disable") {
      return await request("cron.update", { jobId: id, patch: { enabled: false } });
    }
    if (action === "run") {
      return await request("cron.run", { jobId: id });
    }
    return await request("cron.remove", { jobId: id });
  });

  return NextResponse.json({ ok: true, data: payload });
}
