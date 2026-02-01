import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openclawBin } from "../../_lib/openclaw";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const { stdout } = await execFileAsync(
      openclawBin(),
      ["channels", "status", "--json"],
      { maxBuffer: 2 * 1024 * 1024 },
    );

    const data = JSON.parse(stdout);

    // Transform to simpler format for UI
    const channels = Object.entries(data.channels || {}).map(([key, value]: [string, any]) => ({
      channel: key,
      ...value,
      accounts: data.channelAccounts?.[key] || [],
    }));

    return new Response(JSON.stringify({ ok: true, data: { channels, meta: data.channelMeta } }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
