import { z } from "zod";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const runtime = "nodejs";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(10).max(5000).default(200),
  follow: z.enum(["true", "false"]).default("false"),
  file: z.enum(["gateway", "gateway.err", "dashboard"]).default("gateway"),
});

const LogDir = join(homedir(), ".openclaw", "logs");

async function readLogFile(filename: string, limit: number): Promise<string[]> {
  const path = join(LogDir, filename);
  try {
    const content = await readFile(path, "utf8");
    const lines = content.split("\n").filter((l) => l.trim());
    return lines.slice(-limit);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
    follow: url.searchParams.get("follow") ?? "false",
    file: url.searchParams.get("file") ?? "gateway",
  });

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid query", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { limit, follow, file } = parsed.data;
  const filename = file === "gateway.err" ? "gateway.err.log" : `${file}.log`;

  // Non-streaming: just return the last N lines
  if (follow !== "true") {
    const lines = await readLogFile(filename, limit);
    return new Response(JSON.stringify({ ok: true, lines, file: filename }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Streaming mode via SSE - poll the file for changes
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: string) => {
        controller.enqueue(enc.encode(`event: ${event}\n`));
        controller.enqueue(enc.encode(`data: ${data.replace(/\n/g, "\\n")}\n\n`));
      };

      const path = join(LogDir, filename);
      let lastSize = 0;
      let lastLines: string[] = [];

      // Send initial lines
      try {
        const stat = await import("node:fs/promises").then((m) => m.stat(path));
        lastSize = stat.size;
        lastLines = await readLogFile(filename, limit);
        send("connected", JSON.stringify({ file: filename, lines: lastLines.length }));
        for (const line of lastLines) {
          send("line", line);
        }
      } catch (err: unknown) {
        send("error", err instanceof Error ? err.message : String(err));
      }

      // Poll for changes
      const interval = setInterval(async () => {
        try {
          const fs = await import("node:fs/promises");
          const stat = await fs.stat(path);
          if (stat.size > lastSize) {
            // File grew - read new content
            const content = await readFile(path, "utf8");
            const allLines = content.split("\n").filter((l) => l.trim());
            const newLines = allLines.slice(lastLines.length);
            lastLines = allLines;
            lastSize = stat.size;
            for (const line of newLines) {
              send("line", line);
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 1000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        send("end", JSON.stringify({ ok: true }));
        controller.close();
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
