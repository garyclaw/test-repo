import { NextResponse } from "next/server";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openclawBin } from "../../_lib/openclaw";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

const BodySchema = z.object({
  message: z.string().min(1),
  agentId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  thinking: z.enum(["off", "minimal", "low", "medium", "high"]).optional(),
  timeoutSeconds: z.number().int().positive().optional(),
  json: z.boolean().optional(),
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

  const { message, agentId, sessionId, thinking, timeoutSeconds, json: wantJson } = parsed.data;

  const args = ["agent", "--channel", "last", "--message", message, "--json"];
  if (sessionId) args.push("--session-id", sessionId);
  if (agentId) args.push("--agent", agentId);
  if (thinking) args.push("--thinking", thinking);
  if (timeoutSeconds) args.push("--timeout", String(timeoutSeconds));

  try {
    const { stdout, stderr } = await execFileAsync(openclawBin(), args, {
      // Add a cushion so CLI "--timeout" can do its thing without us SIGKILL'ing early.
      timeout: ((timeoutSeconds ?? 600) + 30) * 1000,
      maxBuffer: 8 * 1024 * 1024,
    });

    if (wantJson) {
      try {
        return NextResponse.json({ ok: true, data: JSON.parse(stdout), stderr });
      } catch {
        // fall through
      }
    }

    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (err: unknown) {
    const e = err as { message?: string; stdout?: string; stderr?: string; cmd?: string };
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(err),
        stdout: e?.stdout ?? "",
        stderr: e?.stderr ?? "",
        cmd: e?.cmd,
      },
      { status: 500 },
    );
  }
}
