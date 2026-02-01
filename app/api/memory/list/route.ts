import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const MemoryDir = join(homedir(), ".openclaw", "workspace", "memory");
const MemoryFile = join(homedir(), ".openclaw", "workspace", "MEMORY.md");

export async function GET() {
  try {
    // Get list of memory files
    let files: string[] = [];
    try {
      const entries = await readdir(MemoryDir, { withFileTypes: true });
      files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name)
        .sort()
        .reverse(); // newest first
    } catch {
      // memory dir might not exist yet
    }

    // Check if main MEMORY.md exists
    let mainExists = false;
    try {
      await readFile(MemoryFile, "utf8");
      mainExists = true;
    } catch {
      // doesn't exist
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          main: { path: "MEMORY.md", exists: mainExists },
          daily: files,
          directory: MemoryDir,
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
