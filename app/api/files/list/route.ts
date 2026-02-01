import { readdir, stat } from "node:fs/promises";
import { join, resolve, relative, sep } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const WorkspaceRoot = resolve(join(homedir(), ".openclaw", "workspace"));

function safePath(inputPath: string): string {
  // Normalize and ensure it's within workspace
  const resolved = resolve(join(WorkspaceRoot, inputPath));
  if (!resolved.startsWith(WorkspaceRoot)) {
    throw new Error("Path outside workspace");
  }
  return resolved;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path") ?? ".";

  try {
    const targetPath = safePath(rawPath);
    const stats = await stat(targetPath);

    if (!stats.isDirectory()) {
      return new Response(JSON.stringify({ ok: false, error: "Not a directory" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const entries = await readdir(targetPath, { withFileTypes: true });
    
    const files = entries
      .filter((e) => !e.name.startsWith(".")) // hide dotfiles
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
        path: relative(WorkspaceRoot, join(targetPath, e.name)),
      }))
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "dir" ? -1 : 1;
      });

    const currentPath = relative(WorkspaceRoot, targetPath);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          path: currentPath || ".",
          fullPath: targetPath,
          files,
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
