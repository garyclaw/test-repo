import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { join, resolve, relative } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const WorkspaceRoot = resolve(join(homedir(), ".openclaw", "workspace"));
const AllowedExtensions = [".md", ".txt", ".json", ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".yaml", ".yml", ".toml", ".sh", ".py", ".rs", ".go", ".rb"];

const BodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

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

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid body", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { path: rawPath, content } = parsed.data;

  try {
    const targetPath = safePath(rawPath);
    
    if (!isAllowedFile(targetPath)) {
      return new Response(JSON.stringify({ ok: false, error: "File type not allowed for editing" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Ensure parent directory exists
    await mkdir(dirname(targetPath), { recursive: true });
    
    await writeFile(targetPath, content, "utf8");
    const relPath = relative(WorkspaceRoot, targetPath);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          path: relPath,
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
