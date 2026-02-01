import { NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "node:child_process";
import { openclawBin } from "../../_lib/openclaw";

export const runtime = "nodejs";

const QuerySchema = z.object({
  message: z.string().min(1),
  agentId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  thinking: z.enum(["off", "minimal", "low", "medium", "high"]).optional(),
  timeoutSeconds: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    message: url.searchParams.get("message"),
    agentId: url.searchParams.get("agentId") ?? undefined,
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    thinking: url.searchParams.get("thinking") ?? undefined,
    timeoutSeconds: url.searchParams.get("timeoutSeconds") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid query", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { message, agentId, sessionId, thinking, timeoutSeconds } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: string) => {
        controller.enqueue(enc.encode(`event: ${event}\n`));
        controller.enqueue(enc.encode(`data: ${data.replace(/\n/g, "\\n")}\n\n`));
      };

      const args = ["agent", "--message", message, "--json"];
      if (agentId) args.push("--agent", agentId);
      if (sessionId) args.push("--session-id", sessionId);
      if (thinking) args.push("--thinking", thinking);
      if (timeoutSeconds) args.push("--timeout", String(timeoutSeconds));

      const child = spawn(openclawBin(), args, { stdio: ["ignore", "pipe", "pipe"] });

      send("start", JSON.stringify({ pid: child.pid }));

      child.stdout?.on("data", (buf: Buffer) => {
        const text = buf.toString("utf8");
        send("stdout", text);
      });

      child.stderr?.on("data", (buf: Buffer) => {
        const text = buf.toString("utf8");
        // Filter out known noise
        if (text.includes("punycode") || text.includes("DeprecationWarning")) {
          return;
        }
        send("stderr", text);
      });

      child.on("close", (code) => {
        send("end", JSON.stringify({ ok: code === 0, code }));
        controller.close();
      });

      child.on("error", (err) => {
        send("error", err.message);
        send("end", JSON.stringify({ ok: false }));
        controller.close();
      });

      req.signal.addEventListener("abort", () => {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
