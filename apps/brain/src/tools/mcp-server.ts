/**
 * Custom stdio MCP server the brain exposes to the Claude Agent SDK loop.
 *
 * Tools:
 *  - send_reply_text   : post a plain text message to the originating chat
 *  - send_reply_card   : post an interactive card to the originating chat
 *  - log_step          : emit a debug marker to stderr (no Lark call)
 *
 * All context (chat_id, open_id, thread_id, lark-cli path) is pulled from env
 * vars injected by `runBrain` via the Claude Agent SDK mcpServers config.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execa } from 'execa';

const chatId = process.env.LARK_CHAT_ID ?? '';
const openId = process.env.LARK_OPEN_ID ?? '';
const threadId = process.env.LARK_THREAD_ID ?? '';
const larkCliBin = process.env.LARK_CLI_BIN ?? 'lark-cli';

async function spawnLarkCli(args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const result = await execa(larkCliBin, args, { reject: false, timeout: 30_000 });
    return {
      ok: result.exitCode === 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } catch (err) {
    return { ok: false, stdout: '', stderr: (err as Error).message };
  }
}

const server = new McpServer({ name: 'lark-master-inner', version: '0.1.0' });

server.tool(
  'send_reply_text',
  'Send a plain text reply to the originating Lark chat or user.',
  {
    text: z.string().describe('Message body'),
  },
  async ({ text }) => {
    const args = ['im', '+messages-send', '--text', text];
    if (chatId) args.push('--chat-id', chatId);
    else if (openId) args.push('--open-id', openId);
    const r = await spawnLarkCli(args);
    return {
      content: [{ type: 'text' as const, text: r.ok ? 'ok' : `error: ${r.stderr}` }],
      isError: !r.ok,
    };
  },
);

server.tool(
  'send_reply_card',
  'Send an interactive card reply. Pass the full card JSON object.',
  {
    card: z
      .record(z.unknown())
      .describe('Interactive card JSON object (header / elements)'),
  },
  async ({ card }) => {
    if (!chatId && !openId) {
      return {
        content: [{ type: 'text' as const, text: 'error: no chat_id nor open_id in env' }],
        isError: true,
      };
    }
    const receiveIdType = chatId ? 'chat_id' : 'open_id';
    const receiveId = chatId || openId;
    const params = JSON.stringify({ receive_id_type: receiveIdType });
    const data = JSON.stringify({
      receive_id: receiveId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    });
    const r = await spawnLarkCli([
      'im',
      'messages',
      'create',
      '--format',
      'json',
      '--params',
      params,
      '--data',
      data,
    ]);
    return {
      content: [{ type: 'text' as const, text: r.ok ? 'ok' : `error: ${r.stderr}` }],
      isError: !r.ok,
    };
  },
);

server.tool(
  'log_step',
  'Emit a debug step marker to the brain audit log (stderr).',
  {
    note: z.string(),
  },
  async ({ note }) => {
    process.stderr.write(`[brain:${threadId}] ${note}\n`);
    return { content: [{ type: 'text' as const, text: 'logged' }] };
  },
);

await server.connect(new StdioServerTransport());
