import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const MemoryDir = join(homedir(), ".openclaw", "workspace", "memory");
const MemoryFile = join(homedir(), ".openclaw", "workspace", "MEMORY.md");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filename = url.searchParams.get("file");

  if (!filename) {
    return new Response(JSON.stringify({ ok: false, error: "Missing file parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Security: only allow reading .md files from memory dir or MEMORY.md
  let filepath: string;
  if (filename === "MEMORY.md") {
    filepath = MemoryFile;
  } else if (/^\d{4}-\d{2}-\d{2}\.md$/.test(filename)) {
    filepath = join(MemoryDir, filename);
  } else {
    return new Response(JSON.stringify({ ok: false, error: "Invalid filename" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const content = await readFile(filepath, "utf8");
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          filename,
          content,
          size: content.length,
          lines: content.split("\n").length,
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
