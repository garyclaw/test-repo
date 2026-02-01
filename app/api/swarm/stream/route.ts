import { z } from "zod";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openclawBin } from "../../_lib/openclaw";

export const runtime = "nodejs";

const StorePath = join(process.cwd(), "data", "missions.json");

type Mission = {
  id: string;
  output?: string;
  status?: string;
  updatedAtMs?: number;
  meta?: Record<string, unknown>;
};

async function patchMission(id: string, patch: Partial<Mission>) {
  try {
    const raw = await readFile(StorePath, "utf8");
    const store = JSON.parse(raw);
    if (!store || !Array.isArray(store.missions)) return;
    const idx = store.missions.findIndex((m: Mission) => m.id === id);
    if (idx === -1) return;
    store.missions[idx] = { ...store.missions[idx], ...patch, updatedAtMs: Date.now() };
    await writeFile(StorePath, JSON.stringify(store, null, 2) + "\n", "utf8");
  } catch {
    // ignore
  }
}

const QuerySchema = z.object({
  missionId: z.string().min(1),
  prompt: z.string().min(1),
  // We only have main agent today, but keep this for future.
  agentId: z.string().min(1).optional(),
  thinking: z.enum(["off", "minimal", "low", "medium", "high"]).optional(),
  timeoutSeconds: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    missionId: url.searchParams.get("missionId"),
    prompt: url.searchParams.get("prompt"),
    agentId: url.searchParams.get("agentId"),
    thinking: url.searchParams.get("thinking"),
    timeoutSeconds: url.searchParams.get("timeoutSeconds"),
  });

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid query", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { missionId, prompt, agentId, thinking, timeoutSeconds } = parsed.data;

  const roles = [
    {
      role: "Analyst",
      preamble:
        "You are an Analyst. Output bullets. Focus on competitor research, positioning, pricing bands, channels.",
    },
    {
      role: "Researcher",
      preamble:
        "You are a Researcher. Output factual bullets with URLs and references where possible.",
    },
    {
      role: "Planner",
      preamble:
        "You are a Planner. Output a concrete 14-day test plan: products, content, KPIs, and next steps.",
    },
  ];

  await patchMission(missionId, { status: "running", output: "" });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: string) => {
        controller.enqueue(enc.encode(`event: ${event}\n`));
        controller.enqueue(enc.encode(`data: ${data.replace(/\n/g, "\\n")}\n\n`));
      };

      let combined = "";
      const children = roles.map((r) => {
        const msg = `${r.preamble}\n\nTASK:\n${prompt}`;
        const args = ["agent", "--channel", "last", "--message", msg, "--json"];
        if (agentId) args.push("--agent", agentId);
        if (thinking) args.push("--thinking", thinking);
        if (timeoutSeconds) args.push("--timeout", String(timeoutSeconds));
        const child = spawn(openclawBin(), args, { stdio: ["ignore", "pipe", "pipe"] });

        send("role_start", JSON.stringify({ role: r.role, args }));

        const onOut = (buf: Buffer) => {
          const t = buf.toString("utf8");
          combined += `\n\n=== ${r.role} ===\n` + t;
          send("role_stdout", JSON.stringify({ role: r.role, chunk: t }));
        };
        const onErr = (buf: Buffer) => {
          const t = buf.toString("utf8");
          // Filter out known noise
          if (t.includes("punycode") || t.includes("DeprecationWarning")) {
            return;
          }
          combined += `\n\n=== ${r.role} (stderr) ===\n` + t;
          send("role_stderr", JSON.stringify({ role: r.role, chunk: t }));
        };

        child.stdout?.on("data", onOut);
        child.stderr?.on("data", onErr);

        return { role: r.role, child };
      });

      let finished = 0;
      const results: Record<string, { code: number | null; signal: string | null }> = {};

      children.forEach(({ role, child }) => {
        child.on("close", async (code, signal) => {
          results[role] = { code, signal };
          send("role_end", JSON.stringify({ role, code, signal }));
          finished += 1;
          if (finished === children.length) {
            await patchMission(missionId, { status: "done", output: combined, meta: { results } });
            send("end", JSON.stringify({ ok: true, results }));
            controller.close();
          }
        });
      });

      req.signal.addEventListener("abort", () => {
        for (const { child } of children) {
          try {
            child.kill("SIGTERM");
          } catch {
            // ignore
          }
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
