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
      whiteboard_token: z.string().describe('Whiteboard token (read permission required for image export)'),
      output_as: z.enum(['image', 'code', 'raw']).optional().default('raw').describe('Output format'),
      output: z.string().optional().describe('Output directory (required when output_as=image)'),
      overwrite: z.boolean().optional().describe('Overwrite existing output file'),
    },
    async ({ identity, dry_run, whiteboard_token, output_as, output, overwrite }) => {
      const args = [
        'whiteboard',
        '+query',
        '--whiteboard-token',
        whiteboard_token,
        '--output_as',
        output_as,
      ];
      if (output) args.push('--output', output);
      if (overwrite) args.push('--overwrite');
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_whiteboard_update',
    'Update an existing whiteboard with mermaid / plantuml / raw whiteboard DSL. Wraps `lark-cli whiteboard +update`.',
    {
      ...commonFlagsSchema,
      whiteboard_token: z.string().describe('Whiteboard token (edit permission required)'),
      input_format: z
        .enum(['raw', 'mermaid', 'plantuml'])
        .default('raw')
        .describe('Input DSL format'),
      source: z.string().describe('DSL source to render into the whiteboard'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Overwrite — delete all existing content before update'),
      idempotent_token: z
        .string()
        .optional()
        .describe('Idempotent token (min length 10)'),
    },
    async ({ identity, dry_run, whiteboard_token, input_format, source, overwrite, idempotent_token }) => {
      const args = [
        'whiteboard',
        '+update',
        '--whiteboard-token',
        whiteboard_token,
        '--input_format',
        input_format,
        '--source',
        source,
        '--yes',
      ];
      if (overwrite) args.push('--overwrite');
      if (idempotent_token) args.push('--idempotent-token', idempotent_token);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );
}
