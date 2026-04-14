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
      query: z.string().optional(),
      owners: z.array(z.string()).optional().describe('Owner open_id list'),
      participants: z.array(z.string()).optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
    },
    async ({ identity, dry_run, query, owners, participants, start_time, end_time }) => {
      const args = ['minutes', '+search'];
      if (query) args.push('--query', query);
      if (owners?.length) args.push('--owners', owners.join(','));
      if (participants?.length) args.push('--participants', participants.join(','));
      if (start_time) args.push('--start-time', start_time);
      if (end_time) args.push('--end-time', end_time);
      return callLarkCli({ args, identity: identity ?? 'user', dryRun: dry_run }, cfg);
    },
  );
}
