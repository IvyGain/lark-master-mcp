import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerMailTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_mail_send',
    'Compose and send an email. By default saves as draft; pass confirm_send=true to send immediately. Wraps `lark-cli mail +send`.',
    {
      ...commonFlagsSchema,
      to: z.array(z.string()).min(1).describe('Recipient email addresses'),
      subject: z.string(),
      body: z.string().describe('Plain text or HTML body'),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      confirm_send: z
        .boolean()
        .optional()
        .describe('If true, send immediately (otherwise saved as draft)'),
    },
    async ({ identity, dry_run, to, subject, body, cc, bcc, confirm_send }) => {
      const args = [
        'mail',
        '+send',
        '--to',
        to.join(','),
        '--subject',
        subject,
        '--body',
        body,
      ];
      if (cc && cc.length > 0) args.push('--cc', cc.join(','));
      if (bcc && bcc.length > 0) args.push('--bcc', bcc.join(','));
      if (confirm_send) args.push('--confirm-send');
      return callLarkCli(
        { args, identity: identity ?? 'user', dryRun: dry_run },
        cfg,
      );
    },
  );

  server.tool(
    'lark_mail_triage',
    'List mail summaries (date/from/subject). Wraps `lark-cli mail +triage`.',
    {
      ...commonFlagsSchema,
      query: z.string().optional().describe('Full-text search query'),
      filter: z.string().optional().describe('Exact-match filter, e.g. "from:boss@example.com"'),
      page_all: z.boolean().optional(),
    },
    async ({ identity, dry_run, query, filter, page_all }) => {
      const args = ['mail', '+triage'];
      if (query) args.push('--query', query);
      if (filter) args.push('--filter', filter);
      return callLarkCli(
        { args, identity: identity ?? 'user', dryRun: dry_run, pageAll: page_all },
        cfg,
      );
    },
  );

  server.tool(
    'lark_mail_read_message',
    'Read a single email message by id. Wraps `lark-cli mail +message`.',
    {
      ...commonFlagsSchema,
      message_id: z.string().describe('Email message id'),
    },
    async ({ identity, dry_run, message_id }) =>
      callLarkCli(
        {
          args: ['mail', '+message', '--message-id', message_id],
          identity: identity ?? 'user',
          dryRun: dry_run,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_mail_reply',
    'Reply to an email (saved as draft by default). Wraps `lark-cli mail +reply`.',
    {
      ...commonFlagsSchema,
      message_id: z.string().describe('Parent message id being replied to'),
      body: z.string(),
      confirm_send: z.boolean().optional(),
    },
    async ({ identity, dry_run, message_id, body, confirm_send }) => {
      const args = [
        'mail',
        '+reply',
        '--message-id',
        message_id,
        '--body',
        body,
      ];
      if (confirm_send) args.push('--confirm-send');
      return callLarkCli(
        { args, identity: identity ?? 'user', dryRun: dry_run },
        cfg,
      );
    },
  );
}
