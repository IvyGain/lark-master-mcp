import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerMinutesTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_minutes_search',
    'Search minutes by keyword / owners / participants / time range. Wraps `lark-cli minutes +search`.',
    {
      ...commonFlagsSchema,
      query: z.string().optional().describe('Search keyword'),
      owner_open_ids: z
        .array(z.string())
        .optional()
        .describe('Owner open_id list (use "me" for current user)'),
      participant_open_ids: z
        .array(z.string())
        .optional()
        .describe('Participant open_id list (use "me" for current user)'),
      start: z
        .string()
        .optional()
        .describe('Time lower bound (ISO 8601 or YYYY-MM-DD)'),
      end: z
        .string()
        .optional()
        .describe('Time upper bound (ISO 8601 or YYYY-MM-DD)'),
    },
    async ({ identity, dry_run, query, owner_open_ids, participant_open_ids, start, end }) => {
      const args = ['minutes', '+search'];
      if (query) args.push('--query', query);
      if (owner_open_ids?.length) args.push('--owner-ids', owner_open_ids.join(','));
      if (participant_open_ids?.length) args.push('--participant-ids', participant_open_ids.join(','));
      if (start) args.push('--start', start);
      if (end) args.push('--end', end);
      return callLarkCli({ args, identity: identity ?? 'user', dryRun: dry_run }, cfg);
    },
  );
}
