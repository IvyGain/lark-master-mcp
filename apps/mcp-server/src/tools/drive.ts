import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerDriveTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_drive_list_files',
    'List files in a Drive folder (root by default). Wraps `lark-cli drive files list`.',
    {
      ...commonFlagsSchema,
      folder_token: z
        .string()
        .optional()
        .describe('Folder token. Leave empty for root.'),
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, folder_token, page_all }) => {
      const params: Record<string, unknown> = {};
      if (folder_token) params.folder_token = folder_token;
      const args = ['drive', 'files', 'list'];
      if (Object.keys(params).length > 0) {
        args.push('--params', jsonParam(params));
      }
      return callLarkCli({ args, identity, dryRun: dry_run, pageAll: page_all }, cfg);
    },
  );
}
