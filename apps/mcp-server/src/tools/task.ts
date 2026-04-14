import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerTaskTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_task_create',
    'Create a Lark task. Wraps `lark-cli task +create`.',
    {
      ...commonFlagsSchema,
      summary: z.string().describe('Task title / summary'),
      description: z.string().optional().describe('Task description'),
      due: z
        .string()
        .optional()
        .describe('Due date as ISO8601 or unix seconds string'),
      assignee_open_ids: z
        .array(z.string())
        .optional()
        .describe('open_id list of assignees'),
    },
    async ({ identity, dry_run, summary, description, due, assignee_open_ids }) => {
      const args = ['task', '+create', '--summary', summary];
      if (description) args.push('--description', description);
      if (due) args.push('--due', due);
      if (assignee_open_ids && assignee_open_ids.length > 0) {
        args.push('--assignees', assignee_open_ids.join(','));
      }
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_task_get_mine',
    'List tasks assigned to me. Wraps `lark-cli task +get-my-tasks`.',
    { ...commonFlagsSchema },
    async ({ identity, dry_run }) =>
      callLarkCli(
        { args: ['task', '+get-my-tasks'], identity: identity ?? 'user', dryRun: dry_run },
        cfg,
      ),
  );

  server.tool(
    'lark_task_complete',
    'Mark a task as complete. Wraps `lark-cli task +complete`.',
    {
      ...commonFlagsSchema,
      task_id: z.string().describe('Task id (guid)'),
    },
    async ({ identity, dry_run, task_id }) =>
      callLarkCli(
        { args: ['task', '+complete', '--task-id', task_id], identity, dryRun: dry_run },
        cfg,
      ),
  );

  server.tool(
    'lark_task_reopen',
    'Reopen a completed task. Wraps `lark-cli task +reopen`.',
    {
      ...commonFlagsSchema,
      task_id: z.string(),
    },
    async ({ identity, dry_run, task_id }) =>
      callLarkCli(
        { args: ['task', '+reopen', '--task-id', task_id], identity, dryRun: dry_run },
        cfg,
      ),
  );

  server.tool(
    'lark_task_comment',
    'Add a comment to a task. Wraps `lark-cli task +comment`.',
    {
      ...commonFlagsSchema,
      task_id: z.string(),
      text: z.string(),
    },
    async ({ identity, dry_run, task_id, text }) =>
      callLarkCli(
        {
          args: ['task', '+comment', '--task-id', task_id, '--text', text],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
