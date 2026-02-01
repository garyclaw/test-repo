import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

type ReqFrame = { type: "req"; id: string; method: string; params?: unknown };

type ResFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { message?: string };
};

type EvtFrame = { type: "evt"; event: string; payload?: unknown; seq?: number };

export type GatewayConnInfo = {
  url: string;
  token: string;
};

async function loadGatewayInfo(): Promise<GatewayConnInfo> {
  // Read from OpenClaw config (local-only dashboard).
  const path = `${process.env.HOME ?? ""}/.openclaw/openclaw.json`;
  const raw = await readFile(path, "utf8");
  const cfg = JSON.parse(raw) as unknown;
  const obj = (typeof cfg === "object" && cfg !== null ? (cfg as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const gateway = (typeof obj.gateway === "object" && obj.gateway !== null
    ? (obj.gateway as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const auth = (typeof gateway.auth === "object" && gateway.auth !== null
    ? (gateway.auth as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const portRaw = gateway.port;
  const port = typeof portRaw === "number" && Number.isFinite(portRaw) ? portRaw : 18789;
  const token = typeof auth.token === "string" ? auth.token : undefined;
  if (!token) throw new Error("Missing gateway auth token in ~/.openclaw/openclaw.json");
  return { url: `ws://127.0.0.1:${port}`, token };
}

export async function withGateway<T>(
  fn: (ctx: {
    ws: WebSocket;
    request: (
      method: string,
      params?: unknown,
      opts?: { expectFinal?: boolean; timeoutMs?: number },
    ) => Promise<unknown>;
    onEvent: (handler: (evt: EvtFrame) => void) => () => void;
  }) => Promise<T>,
): Promise<T> {
  const { url, token } = await loadGatewayInfo();

  const ws = new WebSocket(url, {
    handshakeTimeout: 15_000,
    perMessageDeflate: false,
  });

  const pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; expectFinal: boolean; t?: NodeJS.Timeout }
  >();
  const eventHandlers = new Set<(evt: EvtFrame) => void>();

  const request = (method: string, params?: unknown, opts?: { expectFinal?: boolean; timeoutMs?: number }) => {
    const id = randomUUID();
    const frame: ReqFrame = { type: "req", id, method, params };
    const expectFinal = !!opts?.expectFinal;

    const p = new Promise<unknown>((resolve, reject) => {
      const t = opts?.timeoutMs
        ? setTimeout(() => {
            pending.delete(id);
            reject(new Error(`gateway request timeout: ${method}`));
          }, opts.timeoutMs)
        : undefined;
      pending.set(id, { resolve, reject, expectFinal, t });
    });

    ws.send(JSON.stringify(frame));
    return p;
  };

  const onEvent = (handler: (evt: EvtFrame) => void) => {
    eventHandlers.add(handler);
    return () => eventHandlers.delete(handler);
  };

  const openPromise = new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", (err) => reject(err));
  });

  ws.on("message", (buf) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }

    const frame = (typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null) as
      | Record<string, unknown>
      | null;
    if (!frame) return;

    if (frame.type === "evt") {
      const evt = frame as unknown as EvtFrame;
      for (const h of eventHandlers) {
        try {
          h(evt);
        } catch {
          // ignore
        }
      }
      return;
    }

    if (frame.type === "res" && typeof frame.id === "string") {
      const res = frame as unknown as ResFrame;
      const p = pending.get(res.id);
      if (!p) return;
      const payload = (res.payload as unknown) as { status?: unknown };
      const status = typeof payload?.status === "string" ? payload.status : undefined;
      if (p.expectFinal && status === "accepted") {
        return;
      }
      pending.delete(res.id);
      if (p.t) clearTimeout(p.t);
      if (res.ok) p.resolve(res.payload);
      else p.reject(new Error(res?.error?.message ?? "gateway error"));
      return;
    }
  });

  await openPromise;

  // Connect handshake
  await request(
    "connect",
    {
      minProtocol: 1,
      maxProtocol: 1,
      client: {
        id: "gary-dashboard",
        displayName: "Gary Dashboard",
        version: "0.1.0",
        platform: process.platform,
        mode: "backend",
      },
      caps: ["chat", "agent"],
      auth: { token },
      role: "operator",
      scopes: ["operator.admin"],
    },
    { timeoutMs: 15_000 },
  );

  try {
    return await fn({ ws, request, onEvent });
  } finally {
    for (const [, p] of pending) {
      if (p.t) clearTimeout(p.t);
      p.reject(new Error("gateway connection closed"));
    }
    pending.clear();
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
}
