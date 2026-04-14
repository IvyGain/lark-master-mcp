import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
};

const PKG_DIR = path.resolve(__dirname, "..");
const ENTRY = path.join(PKG_DIR, "dist", "index.js");

let child: ChildProcessWithoutNullStreams;
let stdoutBuffer = "";
const pending = new Map<number | string, (res: JsonRpcResponse) => void>();
let nextId = 1;

function handleStdout(chunk: Buffer) {
  stdoutBuffer += chunk.toString("utf8");
  let idx: number;
  while ((idx = stdoutBuffer.indexOf("\n")) !== -1) {
    const line = stdoutBuffer.slice(0, idx).trim();
    stdoutBuffer = stdoutBuffer.slice(idx + 1);
    if (!line.startsWith("{")) continue;
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const resolver = pending.get(msg.id)!;
      pending.delete(msg.id);
      resolver(msg);
    }
  }
}

function send(obj: Record<string, unknown>) {
  child.stdin.write(JSON.stringify(obj) + "\n");
}

function request(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
    }, 30_000);
    pending.set(id, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
    send({ jsonrpc: "2.0", id, method, params: params ?? {} });
  });
}

beforeAll(async () => {
  child = spawn("node", [ENTRY], {
    cwd: PKG_DIR,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });
  child.stdout.on("data", handleStdout);
  child.stderr.on("data", () => {
    // startup banner + logs go to stderr; ignore
  });
  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("child error:", err);
  });

  // initialize handshake
  const initRes = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "vitest-smoke", version: "0.0.1" },
  });
  expect(initRes.result).toBeDefined();
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
});

afterAll(() => {
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
});

describe("lark-master-mcp stdio smoke", () => {
  it("tools/list returns >= 41 lark_* tools including key tools", async () => {
    const res = await request("tools/list", {});
    expect(res.error).toBeUndefined();
    const tools = res.result?.tools as Array<{ name: string }>;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThanOrEqual(41);
    for (const t of tools) {
      expect(t.name.startsWith("lark_")).toBe(true);
    }
    const names = new Set(tools.map((t) => t.name));
    expect(names.has("lark_doctor")).toBe(true);
    expect(names.has("lark_calendar_agenda")).toBe(true);
    expect(names.has("lark_im_invite_bot_to_chat")).toBe(true);
  });

  it("tools/call lark_doctor returns larkCli info and no isError", async () => {
    const res = await request("tools/call", {
      name: "lark_doctor",
      arguments: {},
    });
    expect(res.error).toBeUndefined();
    const result = res.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    expect(result).toBeDefined();
    expect(result.isError).not.toBe(true);
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]?.text ?? "").toContain("larkCli");
  });

  it("tools/call lark_calendar_agenda round-trips (result present)", async () => {
    const res = await request("tools/call", {
      name: "lark_calendar_agenda",
      arguments: { identity: "bot", dry_run: true },
    });
    // RPC layer succeeded (result object exists). Content may be error for bot identity.
    expect(res.error).toBeUndefined();
    expect(res.result).toBeDefined();
  });
});
