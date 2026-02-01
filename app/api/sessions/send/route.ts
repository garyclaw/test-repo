import { NextResponse } from "next/server";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openclawBin } from "../../_lib/openclaw";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

const BodySchema = z.object({
  sessionKey: z.string().min(1),
  message: z.string().min(1),
  timeoutSeconds: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sessionKey, message, timeoutSeconds } = parsed.data;

  const args = ["sessions", "send", "--session", sessionKey, "--message", message];
  if (timeoutSeconds) args.push("--timeout", String(timeoutSeconds));

  const { stdout } = await execFileAsync(openclawBin(), args, {
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  return NextResponse.json({ ok: true, stdout });
}
