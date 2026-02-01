import { NextResponse } from "next/server";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const StorePath = join(process.cwd(), "data", "missions.json");

type Mission = {
  id: string;
  title: string;
  prompt: string;
  mode: "single" | "swarm";
  agentId?: string;
  createdAtMs: number;
  updatedAtMs: number;
  status: "queued" | "running" | "done" | "error";
  output?: string;
  meta?: Record<string, unknown>;
};

async function loadStore(): Promise<{ missions: Mission[] }> {
  try {
    const raw = await readFile(StorePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.missions)) return parsed;
  } catch {
    // ignore
  }
  return { missions: [] };
}

async function saveStore(store: { missions: Mission[] }) {
  await writeFile(StorePath, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export async function GET() {
  const store = await loadStore();
  // newest first
  store.missions.sort((a, b) => (b.updatedAtMs ?? b.createdAtMs) - (a.updatedAtMs ?? a.createdAtMs));
  return NextResponse.json({ ok: true, data: store });
}

const CreateSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.enum(["single", "swarm"]).default("single"),
  agentId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await loadStore();
  const now = Date.now();
  const id = `m_${now}_${Math.random().toString(16).slice(2)}`;

  const mission: Mission = {
    id,
    title: parsed.data.title,
    prompt: parsed.data.prompt,
    mode: parsed.data.mode,
    agentId: parsed.data.agentId,
    createdAtMs: now,
    updatedAtMs: now,
    status: "queued",
  };

  store.missions.unshift(mission);
  await saveStore(store);

  return NextResponse.json({ ok: true, data: mission });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["queued", "running", "done", "error"]).optional(),
  output: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
  title: z.string().optional(),
});

export async function PATCH(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await loadStore();
  const idx = store.missions.findIndex((m) => m.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "Mission not found" }, { status: 404 });
  }

  const m = store.missions[idx];
  store.missions[idx] = {
    ...m,
    title: parsed.data.title ?? m.title,
    status: parsed.data.status ?? m.status,
    output: parsed.data.output ?? m.output,
    meta: parsed.data.meta ? { ...(m.meta ?? {}), ...parsed.data.meta } : m.meta,
    updatedAtMs: Date.now(),
  };

  await saveStore(store);
  return NextResponse.json({ ok: true, data: store.missions[idx] });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const parsed = DeleteSchema.safeParse({ id: url.searchParams.get("id") });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Missing id", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const store = await loadStore();
  const before = store.missions.length;
  store.missions = store.missions.filter((m) => m.id !== parsed.data.id);

  if (store.missions.length === before) {
    return NextResponse.json({ ok: false, error: "Mission not found" }, { status: 404 });
  }

  await saveStore(store);
  return NextResponse.json({ ok: true });
}
