import { NextResponse } from "next/server";
import { withGateway } from "../../_lib/gateway";

export const runtime = "nodejs";

export async function GET() {
  const payload = await withGateway(async ({ request }) => {
    return await request("skills.status", {});
  });

  // Preserve the old UI expectation: `data.skills` is an array.
  const p = payload as { skills?: unknown };
  const skills = Array.isArray(p?.skills) ? p.skills : [];

  return NextResponse.json({ ok: true, data: { ...p, skills } });
}
