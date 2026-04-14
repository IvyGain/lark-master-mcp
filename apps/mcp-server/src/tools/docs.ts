import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerDocsTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_docs_create',
    'Create a new Lark Docx document. Wraps `lark-cli docs +create`.',
    {
      ...commonFlagsSchema,
      title: z.string().describe('Document title'),
      folder_token: z
        .string()
        .optional()
        .describe('Parent folder token. Leave empty for root.'),
    },
    async ({ identity, dry_run, title, folder_token }) => {
      const args = ['docs', '+create', '--title', title];
      if (folder_token) args.push('--folder-token', folder_token);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_docs_get_content',
    'Fetch the raw blocks of a Docx document. Wraps `lark-cli docs documents get`.',
    {
      ...commonFlagsSchema,
      document_id: z.string().describe('Docx document_id (doxcn... or doccn...)'),
    },
    async ({ identity, dry_run, document_id }) =>
      callLarkCli(
        {
          args: [
            'docs',
            'documents',
            'get',
            '--params',
            jsonParam({ document_id }),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
