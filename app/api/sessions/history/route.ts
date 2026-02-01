import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export const runtime = "nodejs";

const SessionsDir = join(homedir(), ".openclaw", "agents", "main", "sessions");

function extractTextContent(msg: any): string {
  const content = msg?.message?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p: any) => {
        if (typeof p === "string") return p;
        if (p?.type === "text") return String(p.text ?? "");
        if (p?.type === "thinking") return "💭 " + String(p.thinking ?? "").slice(0, 100) + "...";
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionKey = url.searchParams.get("sessionKey");
  const limit = Number(url.searchParams.get("limit") ?? "50");

  if (!sessionKey) {
    return NextResponse.json({ ok: false, error: "Missing sessionKey" }, { status: 400 });
  }

  try {
    // Read sessions.json to get sessionId
    const sessionsJson = await readFile(join(SessionsDir, "sessions.json"), "utf8");
    const sessions = JSON.parse(sessionsJson);
    const session = sessions[sessionKey];
    
    if (!session?.sessionFile) {
      return NextResponse.json({ ok: true, data: { sessionKey, sessionId: null, messages: [] } });
    }

    // Read the session JSONL file
    const content = await readFile(session.sessionFile, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    
    // Parse messages (newest first, then reverse)
    const messages = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is any => entry?.type === "message")
      .map((entry) => ({
        role: entry.message?.role,
        content: extractTextContent(entry),
        ts: entry.timestamp || entry.message?.timestamp,
      }))
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-limit);

    return NextResponse.json({
      ok: true,
      data: {
        sessionKey,
        sessionId: session.sessionId || null,
        messages,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
