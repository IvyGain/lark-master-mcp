import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerWikiTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_wiki_create_node',
    'Create a new wiki node (page) with automatic space resolution. Wraps `lark-cli wiki +node-create`.',
    {
      ...commonFlagsSchema,
      title: z.string().describe('Page title'),
      space_id: z
        .string()
        .optional()
        .describe('Target space id. If omitted, lark-cli auto-resolves.'),
      parent_node_token: z
        .string()
        .optional()
        .describe('Parent node token to nest under'),
      obj_type: z
        .enum(['doc', 'docx', 'sheet', 'mindnote', 'bitable'])
        .optional()
        .default('docx')
        .describe('Kind of wiki node to create'),
    },
    async ({ identity, dry_run, title, space_id, parent_node_token, obj_type }) => {
      const args = ['wiki', '+node-create', '--title', title];
      if (space_id) args.push('--space-id', space_id);
      if (parent_node_token) args.push('--parent-node-token', parent_node_token);
      if (obj_type) args.push('--obj-type', obj_type);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_wiki_spaces_list',
    'List wiki spaces visible to the identity. Wraps `lark-cli wiki spaces list`.',
    {
      ...commonFlagsSchema,
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, page_all }) =>
      callLarkCli(
        { args: ['wiki', 'spaces', 'list'], identity, dryRun: dry_run, pageAll: page_all },
        cfg,
      ),
  );

  server.tool(
    'lark_wiki_nodes_list',
    'List nodes in a wiki space. Wraps `lark-cli wiki nodes list`.',
    {
      ...commonFlagsSchema,
      space_id: z.string().describe('Wiki space id'),
      parent_node_token: z.string().optional(),
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, space_id, parent_node_token, page_all }) => {
      const params: Record<string, unknown> = { space_id };
      if (parent_node_token) params.parent_node_token = parent_node_token;
      return callLarkCli(
        {
          args: ['wiki', 'nodes', 'list', '--params', jsonParam(params)],
          identity,
          dryRun: dry_run,
          pageAll: page_all,
        },
        cfg,
      );
    },
  );
}
