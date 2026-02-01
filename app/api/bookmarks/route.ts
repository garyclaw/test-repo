import { NextResponse } from "next/server";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const StorePath = join(process.cwd(), "data", "bookmarks.json");

type Bookmark = {
  id: string;
  title: string;
  url?: string;
  note?: string;
  tags?: string[];
  createdAtMs: number;
  updatedAtMs: number;
};

async function loadStore(): Promise<{ bookmarks: Bookmark[] }> {
  try {
    const raw = await readFile(StorePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.bookmarks)) return parsed;
  } catch {
    // ignore
  }
  return { bookmarks: [] };
}

async function saveStore(store: { bookmarks: Bookmark[] }) {
  await writeFile(StorePath, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export async function GET() {
  const store = await loadStore();
  store.bookmarks.sort((a, b) => (b.updatedAtMs ?? b.createdAtMs) - (a.updatedAtMs ?? a.createdAtMs));
  return NextResponse.json({ ok: true, data: store });
}

const CreateSchema = z.object({
  title: z.string().min(1),
  url: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
  const id = `b_${now}_${Math.random().toString(16).slice(2)}`;

  const b: Bookmark = {
    id,
    title: parsed.data.title,
    url: parsed.data.url,
    note: parsed.data.note,
    tags: parsed.data.tags,
    createdAtMs: now,
    updatedAtMs: now,
  };

  store.bookmarks.unshift(b);
  await saveStore(store);
  return NextResponse.json({ ok: true, data: b });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
  const idx = store.bookmarks.findIndex((b) => b.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "Bookmark not found" }, { status: 404 });
  }

  const b = store.bookmarks[idx];
  store.bookmarks[idx] = {
    ...b,
    title: parsed.data.title ?? b.title,
    url: parsed.data.url ?? b.url,
    note: parsed.data.note ?? b.note,
    tags: parsed.data.tags ?? b.tags,
    updatedAtMs: Date.now(),
  };

  await saveStore(store);
  return NextResponse.json({ ok: true, data: store.bookmarks[idx] });
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
  const before = store.bookmarks.length;
  store.bookmarks = store.bookmarks.filter((b) => b.id !== parsed.data.id);

  if (store.bookmarks.length === before) {
    return NextResponse.json({ ok: false, error: "Bookmark not found" }, { status: 404 });
  }

  await saveStore(store);
  return NextResponse.json({ ok: true });
}
