import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerContactTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_contact_search_user',
    'Search users by keyword (name / email). Wraps `lark-cli contact +search-user`.',
    {
      ...commonFlagsSchema,
      query: z.string().describe('Search query (name, email, phone)'),
    },
    async ({ identity, dry_run, query }) =>
      callLarkCli(
        { args: ['contact', '+search-user', '--query', query], identity, dryRun: dry_run },
        cfg,
      ),
  );
}
