import { z } from 'zod';
import { runLarkCli, LarkCliError, type LarkCliInvocation } from '../exec/lark-cli.js';
import type { RuntimeConfig } from '../config.js';

export const identitySchema = z.enum(['user', 'bot', 'auto']).optional();

export const commonFlagsSchema = {
  identity: identitySchema.describe(
    'Lark身份 (user=自分のリソース, bot=Botのリソース, auto=lark-cli既定)',
  ),
  dry_run: z
    .boolean()
    .optional()
    .describe('実行せずに lark-cli のリクエスト内容だけ表示'),
};

type McpContent =
  | { type: 'text'; text: string }
  | { type: 'resource'; resource: { uri: string; mimeType: string; text: string } };

export interface McpToolResult {
  [x: string]: unknown;
  content: McpContent[];
  isError?: boolean;
}

export function ok(parsed: unknown, command: string, durationMs: number): McpToolResult {
  const body =
    parsed === undefined
      ? 'lark-cli exited with no JSON output'
      : typeof parsed === 'string'
      ? parsed
      : JSON.stringify(parsed, null, 2);
  return {
    content: [
      { type: 'text', text: body },
      { type: 'text', text: `\n---\ncommand: ${command}\nduration: ${durationMs}ms` },
    ],
  };
}

export function fail(message: string, extra?: { command?: string; stderr?: string }): McpToolResult {
  const pieces = [`❌ ${message}`];
  if (extra?.command) pieces.push(`command: ${extra.command}`);
  if (extra?.stderr) pieces.push(`stderr:\n${extra.stderr}`);
  return {
    isError: true,
    content: [{ type: 'text', text: pieces.join('\n') }],
  };
}

function isConfirmationRequired(text: string | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    const obj = JSON.parse(trimmed) as { ok?: boolean; error?: { type?: string } };
    return obj.ok === false && obj.error?.type === 'confirmation_required';
  } catch {
    return /confirmation_required/.test(trimmed);
  }
}

export async function callLarkCli(
  invocation: LarkCliInvocation,
  cfg: RuntimeConfig,
): Promise<McpToolResult> {
  try {
    let result = await runLarkCli(invocation, cfg);

    // Auto-retry with --yes when lark-cli demands confirmation for high-risk writes.
    // lark-cli signals this via exit code 10 with `error.type=confirmation_required`
    // emitted on stderr. The MCP server is the user's intent-confirmation layer
    // (the AI client already got user approval before issuing the tool call),
    // so we silently re-confirm.
    if (
      !result.ok &&
      !invocation.args.includes('--yes') &&
      (isConfirmationRequired(result.stderr) || isConfirmationRequired(result.stdout))
    ) {
      result = await runLarkCli(
        { ...invocation, args: [...invocation.args, '--yes'] },
        cfg,
      );
    }

    if (!result.ok) {
      return fail(
        `lark-cli exited with code ${result.exitCode}`,
        { command: result.command, stderr: result.stderr || result.stdout },
      );
    }
    return ok(result.parsed ?? result.stdout, result.command, result.durationMs);
  } catch (err) {
    if (err instanceof LarkCliError) {
      return fail(err.message, { command: err.command, stderr: err.stderr });
    }
    return fail(`Unexpected error: ${(err as Error).message}`);
  }
}

export function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}
