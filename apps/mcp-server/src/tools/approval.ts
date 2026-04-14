import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerApprovalTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_approval_my_tasks',
    'Query the current user approval tasks by topic. Wraps `lark-cli approval tasks query`.',
    {
      ...commonFlagsSchema,
      topic: z
        .enum(['1', '2', '3', '17', '18'])
        .default('1')
        .describe('Topic: 1=pending, 2=initiated, 3=processed, 17=cc, 18=all'),
      user_id: z
        .string()
        .optional()
        .describe('Target user_id (open_id). Defaults to the caller.'),
      page_all: z.boolean().optional().default(true),
    },
    async ({ identity, dry_run, topic, user_id, page_all }) => {
      const params: Record<string, unknown> = { topic };
      if (user_id) {
        params.user_id = user_id;
        params.user_id_type = 'open_id';
      }
      return callLarkCli(
        {
          args: ['approval', 'tasks', 'query', '--params', jsonParam(params)],
          identity: identity ?? 'user',
          dryRun: dry_run,
          pageAll: page_all,
        },
        cfg,
      );
    },
  );

  server.tool(
    'lark_approval_approve',
    'Approve an approval task. Wraps `lark-cli approval tasks approve`.',
    {
      ...commonFlagsSchema,
      approval_code: z.string().describe('Approval definition code'),
      instance_code: z.string().describe('Approval instance code'),
      task_id: z.string().describe('Approval task id'),
      user_id: z.string().describe('Approver user_id (open_id)'),
      comment: z.string().optional(),
    },
    async ({ identity, dry_run, approval_code, instance_code, task_id, user_id, comment }) => {
      const data: Record<string, unknown> = { approval_code, instance_code, task_id, user_id };
      if (comment) data.comment = comment;
      return callLarkCli(
        {
          args: ['approval', 'tasks', 'approve', '--data', jsonParam(data)],
          identity: identity ?? 'user',
          dryRun: dry_run,
        },
        cfg,
      );
    },
  );

  server.tool(
    'lark_approval_reject',
    'Reject an approval task. Wraps `lark-cli approval tasks reject`.',
    {
      ...commonFlagsSchema,
      approval_code: z.string(),
      instance_code: z.string(),
      task_id: z.string(),
      user_id: z.string(),
      comment: z.string().optional(),
    },
    async ({ identity, dry_run, approval_code, instance_code, task_id, user_id, comment }) => {
      const data: Record<string, unknown> = { approval_code, instance_code, task_id, user_id };
      if (comment) data.comment = comment;
      return callLarkCli(
        {
          args: ['approval', 'tasks', 'reject', '--data', jsonParam(data)],
          identity: identity ?? 'user',
          dryRun: dry_run,
        },
        cfg,
      );
    },
  );

  server.tool(
    'lark_approval_instance_get',
    'Get details of a single approval instance. Wraps `lark-cli approval instances get`.',
    {
      ...commonFlagsSchema,
      instance_code: z.string(),
    },
    async ({ identity, dry_run, instance_code }) =>
      callLarkCli(
        {
          args: [
            'approval',
            'instances',
            'get',
            '--params',
            jsonParam({ instance_code }),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
