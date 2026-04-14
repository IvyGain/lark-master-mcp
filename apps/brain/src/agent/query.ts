import { query } from '@anthropic-ai/claude-agent-sdk';
import { SYSTEM_PROMPT } from './system-prompt.js';

export interface BrainInvokeInput {
  threadId: string;
  sessionId: string | null;
  prompt: string;
  openId?: string;
  chatId?: string;
  eventType: string;
  larkCtx: {
    appId: string;
    appSecret: string;
    domain?: string;
  };
}

export interface BrainInvokeResult {
  reply: string;
  sessionId?: string;
  toolCalls: unknown[];
  durationMs: number;
}

/**
 * Run one brain turn for a Lark event.
 *
 * Streams messages from Claude Agent SDK, collects tool calls, and returns the
 * final assistant text as `reply`.
 */
export async function runBrain(input: BrainInvokeInput): Promise<BrainInvokeResult> {
  const started = Date.now();
  const toolCalls: unknown[] = [];
  let reply = '';
  let capturedSessionId: string | undefined;

  const userPrompt = buildUserPrompt(input);

  // We rely on the Bash built-in tool for lark-cli, and expose a small custom
  // MCP for sending replies back into Lark. The custom MCP is spawned per
  // invocation as a child process (stdio) so it inherits the lark-cli env.
  const iter = query({
    prompt: userPrompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      resume: input.sessionId ?? undefined,
      allowedTools: ['Bash', 'mcp__lark-master__send_reply_text', 'mcp__lark-master__send_reply_card', 'mcp__lark-master__log_step'],
      disallowedTools: ['Edit', 'Write', 'Read', 'WebFetch', 'WebSearch'],
      mcpServers: {
        'lark-master': {
          command: 'node',
          args: ['dist/tools/mcp-server.js'],
          env: {
            LARK_CHAT_ID: input.chatId ?? '',
            LARK_OPEN_ID: input.openId ?? '',
            LARK_THREAD_ID: input.threadId,
            LARK_CLI_BIN: process.env.LARK_CLI_BIN ?? 'lark-cli',
            LARK_APP_ID: input.larkCtx.appId,
            LARK_APP_SECRET: input.larkCtx.appSecret,
            LARK_DOMAIN: input.larkCtx.domain ?? '',
          },
        },
      },
    },
  });

  for await (const msg of iter) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      capturedSessionId = msg.session_id;
    }
    if (msg.type === 'assistant') {
      const content = (msg as unknown as { message: { content: unknown[] } }).message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          const b = block as { type: string; text?: string };
          if (b.type === 'text' && typeof b.text === 'string') {
            reply += b.text;
          }
          if (b.type === 'tool_use') {
            toolCalls.push(block);
          }
        }
      }
    }
  }

  return {
    reply: reply.trim(),
    sessionId: capturedSessionId,
    toolCalls,
    durationMs: Date.now() - started,
  };
}

function buildUserPrompt(input: BrainInvokeInput): string {
  const context: string[] = [];
  context.push(`[event_type=${input.eventType}]`);
  if (input.openId) context.push(`[user_open_id=${input.openId}]`);
  if (input.chatId) context.push(`[chat_id=${input.chatId}]`);
  return `${context.join(' ')}\n\n${input.prompt}`;
}
