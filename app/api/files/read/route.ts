import { readFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const WorkspaceRoot = resolve(join(homedir(), ".openclaw", "workspace"));
const AllowedExtensions = [".md", ".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".yaml", ".yml", ".toml", ".sh", ".py", ".rs", ".go", ".rb"];

function safePath(inputPath: string): string {
  const resolved = resolve(join(WorkspaceRoot, inputPath));
  if (!resolved.startsWith(WorkspaceRoot)) {
    throw new Error("Path outside workspace");
  }
  return resolved;
}

function isAllowedFile(path: string): boolean {
  return AllowedExtensions.some((ext) => path.toLowerCase().endsWith(ext));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path");

  if (!rawPath) {
    return new Response(JSON.stringify({ ok: false, error: "Missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const targetPath = safePath(rawPath);
    
    if (!isAllowedFile(targetPath)) {
      return new Response(JSON.stringify({ ok: false, error: "File type not allowed for editing" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const content = await readFile(targetPath, "utf8");
    const relPath = relative(WorkspaceRoot, targetPath);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          path: relPath,
          content,
          size: content.length,
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
