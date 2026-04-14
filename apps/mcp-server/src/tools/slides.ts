import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerSlidesTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_slides_create',
    'Create a new Lark Slides presentation. Wraps `lark-cli slides +create`.',
    {
      ...commonFlagsSchema,
      title: z.string().describe('Presentation title'),
      folder_token: z.string().optional().describe('Parent folder token'),
    },
    async ({ identity, dry_run, title, folder_token }) => {
      const args = ['slides', '+create', '--title', title];
      if (folder_token) args.push('--folder-token', folder_token);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );
}
