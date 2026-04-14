import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerMessagingTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_im_send_text',
    'Send a plain text message to a Lark chat or user. Wraps `lark-cli im +messages-send`.',
    {
      ...commonFlagsSchema,
      chat_id: z
        .string()
        .optional()
        .describe('Target chat_id (oc_xxx) OR leave empty and use open_id'),
      open_id: z
        .string()
        .optional()
        .describe('Target user open_id (ou_xxx). Alternative to chat_id'),
      text: z.string().describe('Plain text body'),
    },
    async ({ identity, dry_run, chat_id, open_id, text }) => {
      const args = ['im', '+messages-send', '--text', text];
      if (chat_id) args.push('--chat-id', chat_id);
      if (open_id) args.push('--open-id', open_id);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_im_send_card',
    'Send an interactive card message. Wraps `lark-cli im messages create` with msg_type=interactive.',
    {
      ...commonFlagsSchema,
      receive_id_type: z
        .enum(['open_id', 'chat_id', 'union_id', 'email'])
        .default('chat_id'),
      receive_id: z.string().describe('Target receiver id matching receive_id_type'),
      card: z
        .record(z.unknown())
        .describe('Interactive card JSON object (header/elements)'),
    },
    async ({ identity, dry_run, receive_id_type, receive_id, card }) =>
      callLarkCli(
        {
          args: [
            'im',
            'messages',
            'create',
            '--params',
            jsonParam({ receive_id_type }),
            '--data',
            jsonParam({
              receive_id,
              msg_type: 'interactive',
              content: JSON.stringify(card),
            }),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_im_list_chats',
    'List chats visible to the current identity. Wraps `lark-cli im chats list`.',
    {
      ...commonFlagsSchema,
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, page_all }) =>
      callLarkCli(
        { args: ['im', 'chats', 'list'], identity, dryRun: dry_run, pageAll: page_all },
        cfg,
      ),
  );

  server.tool(
    'lark_im_invite_bot_to_chat',
    'Invite a Bot (app) into an existing chat. Wraps `lark-cli im chats members create`.',
    {
      ...commonFlagsSchema,
      chat_id: z.string().describe('Chat id (oc_xxx)'),
      app_id: z
        .string()
        .describe('Bot app_id (cli_xxxx). If omitted, uses the lark-cli configured app'),
    },
    async ({ identity, dry_run, chat_id, app_id }) =>
      callLarkCli(
        {
          args: [
            'im',
            'chats',
            'members',
            'create',
            '--params',
            jsonParam({ chat_id, member_id_type: 'app_id' }),
            '--data',
            jsonParam({ id_list: [app_id] }),
          ],
          identity: identity ?? 'bot',
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
