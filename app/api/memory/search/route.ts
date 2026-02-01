import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const MemoryDir = join(homedir(), ".openclaw", "workspace", "memory");
const MemoryFile = join(homedir(), ".openclaw", "workspace", "MEMORY.md");

interface SearchResult {
  file: string;
  line: number;
  text: string;
  context: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.toLowerCase().trim();

  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ ok: false, error: "Query must be at least 2 characters" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const results: SearchResult[] = [];

  try {
    // Search MEMORY.md first
    try {
      const content = await readFile(MemoryFile, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(query)) {
          const start = Math.max(0, idx - 1);
          const end = Math.min(lines.length, idx + 2);
          results.push({
            file: "MEMORY.md",
            line: idx + 1,
            text: line.trim(),
            context: lines.slice(start, end).join("\n"),
          });
        }
      });
    } catch {
      // MEMORY.md doesn't exist
    }

    // Search daily notes
    try {
      const entries = await readdir(MemoryDir, { withFileTypes: true });
      const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));

      for (const entry of mdFiles) {
        try {
          const content = await readFile(join(MemoryDir, entry.name), "utf8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query)) {
              const start = Math.max(0, idx - 1);
              const end = Math.min(lines.length, idx + 2);
              results.push({
                file: entry.name,
                line: idx + 1,
                text: line.trim(),
                context: lines.slice(start, end).join("\n"),
              });
            }
          });
        } catch {
          // skip files we can't read
        }
      }
    } catch {
      // memory dir doesn't exist
    }

    // Sort: MEMORY.md first, then by date descending
    results.sort((a, b) => {
      if (a.file === "MEMORY.md" && b.file !== "MEMORY.md") return -1;
      if (b.file === "MEMORY.md" && a.file !== "MEMORY.md") return 1;
      return b.file.localeCompare(a.file);
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          query,
          count: results.length,
          results: results.slice(0, 50), // limit results
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
