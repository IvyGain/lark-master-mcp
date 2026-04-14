import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerBaseTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_base_create_app',
    'Create a new Base (Bitable) application. Wraps `lark-cli base apps create`.',
    {
      ...commonFlagsSchema,
      name: z.string().describe('Base application display name'),
      folder_token: z.string().optional().describe('Parent folder token'),
    },
    async ({ identity, dry_run, name, folder_token }) => {
      const data: Record<string, unknown> = { name };
      if (folder_token) data.folder_token = folder_token;
      return callLarkCli(
        {
          args: ['base', 'apps', 'create', '--data', jsonParam(data)],
          identity,
          dryRun: dry_run,
        },
        cfg,
      );
    },
  );

  server.tool(
    'lark_base_add_record',
    'Append a record to a Base table. Wraps `lark-cli base records create`.',
    {
      ...commonFlagsSchema,
      app_token: z.string().describe('Base app_token (bascn...)'),
      table_id: z.string().describe('Table id (tblxxx)'),
      fields: z
        .record(z.unknown())
        .describe('Field map, e.g. {"Title":"hello","Count":3}'),
    },
    async ({ identity, dry_run, app_token, table_id, fields }) =>
      callLarkCli(
        {
          args: [
            'base',
            'records',
            'create',
            '--params',
            jsonParam({ app_token, table_id }),
            '--data',
            jsonParam({ fields }),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_base_list_records',
    'List records from a Base table. Wraps `lark-cli base records list`.',
    {
      ...commonFlagsSchema,
      app_token: z.string(),
      table_id: z.string(),
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, app_token, table_id, page_all }) =>
      callLarkCli(
        {
          args: [
            'base',
            'records',
            'list',
            '--params',
            jsonParam({ app_token, table_id }),
          ],
          identity,
          dryRun: dry_run,
          pageAll: page_all,
        },
        cfg,
      ),
  );
}
