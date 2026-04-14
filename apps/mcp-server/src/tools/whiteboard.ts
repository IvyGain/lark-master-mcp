import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerWhiteboardTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_whiteboard_query',
    'Query an existing whiteboard and export preview image or raw nodes. Wraps `lark-cli whiteboard +query`.',
    {
      ...commonFlagsSchema,
      whiteboard_id: z.string().describe('Whiteboard id / token'),
      format: z.enum(['image', 'nodes']).optional().default('nodes'),
    },
    async ({ identity, dry_run, whiteboard_id, format }) => {
      const args = ['whiteboard', '+query', '--whiteboard-id', whiteboard_id, '--format', format];
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_whiteboard_update',
    'Update an existing whiteboard with mermaid / plantuml / whiteboard DSL. Wraps `lark-cli whiteboard +update`.',
    {
      ...commonFlagsSchema,
      whiteboard_id: z.string(),
      dsl_type: z.enum(['mermaid', 'plantuml', 'whiteboard']).describe('DSL language of the body'),
      body: z.string().describe('DSL source to render into the whiteboard'),
    },
    async ({ identity, dry_run, whiteboard_id, dsl_type, body }) =>
      callLarkCli(
        {
          args: [
            'whiteboard',
            '+update',
            '--whiteboard-id',
            whiteboard_id,
            '--dsl-type',
            dsl_type,
            '--body',
            body,
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
