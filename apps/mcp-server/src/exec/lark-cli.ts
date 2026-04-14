import { execa } from 'execa';
import type { Identity, RuntimeConfig } from '../config.js';

export interface LarkCliInvocation {
  args: string[];
  identity?: Identity;
  dryRun?: boolean;
  jq?: string;
  pageAll?: boolean;
  pageLimit?: number;
  timeoutMs?: number;
}

export interface LarkCliResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  parsed?: unknown;
  exitCode: number | null;
  durationMs: number;
}

export class LarkCliError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(message);
    this.name = 'LarkCliError';
  }
}

// Shortcut commands (prefixed with '+') do not accept --format. They always
// emit JSON anyway. Detect and skip the --format injection for them.
function usesShortcutCommand(args: string[]): boolean {
  return args.some((a) => a.startsWith('+'));
}

function buildArgs(inv: LarkCliInvocation, cfg: RuntimeConfig): string[] {
  const out: string[] = [...inv.args];

  // Structured-response API subcommands accept --format; shortcut commands don't.
  if (!out.includes('--format') && !usesShortcutCommand(out)) {
    out.push('--format', 'json');
  }

  const identity = inv.identity ?? cfg.defaultIdentity;
  if (identity !== 'auto' && !out.includes('--as')) {
    out.push('--as', identity);
  }

  if (inv.dryRun && !out.includes('--dry-run')) out.push('--dry-run');

  if (inv.pageAll && !out.includes('--page-all')) {
    out.push('--page-all');
    if (inv.pageLimit !== undefined) {
      out.push('--page-limit', String(inv.pageLimit));
    }
  }

  if (inv.jq && !out.includes('--jq')) {
    out.push('--jq', inv.jq);
  }

  return out;
}

function tryParseJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // ndjson fallback
    if (trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(Boolean);
      try {
        return lines.map((l) => JSON.parse(l));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

export async function runLarkCli(
  inv: LarkCliInvocation,
  cfg: RuntimeConfig,
): Promise<LarkCliResult> {
  const args = buildArgs(inv, cfg);
  const commandStr = [cfg.larkCliBin, ...args].join(' ');
  const started = Date.now();

  try {
    const result = await execa(cfg.larkCliBin, args, {
      timeout: inv.timeoutMs ?? 60_000,
      reject: false,
      env: {
        ...process.env,
        ...(cfg.domain ? { LARK_DOMAIN: cfg.domain } : {}),
      },
    });

    const durationMs = Date.now() - started;
    const ok = result.exitCode === 0;
    const parsed = ok ? tryParseJson(result.stdout) : undefined;

    return {
      ok,
      command: commandStr,
      stdout: result.stdout,
      stderr: result.stderr,
      parsed,
      exitCode: result.exitCode ?? null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - started;
    const maybe = err as {
      shortMessage?: string;
      message?: string;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      exitCode?: number;
    };
    throw new LarkCliError(
      maybe.shortMessage ||
        maybe.message ||
        `lark-cli spawn failed after ${durationMs}ms`,
      commandStr,
      maybe.stdout?.toString() ?? '',
      maybe.stderr?.toString() ?? '',
      maybe.exitCode ?? null,
    );
  }
}

export async function probeLarkCli(cfg: RuntimeConfig): Promise<{ version: string | null; reachable: boolean }> {
  try {
    const result = await execa(cfg.larkCliBin, ['--version'], { timeout: 10_000, reject: false });
    if (result.exitCode === 0) {
      return { version: result.stdout.trim(), reachable: true };
    }
    return { version: null, reachable: false };
  } catch {
    return { version: null, reachable: false };
  }
}
