import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

export function registerTaskTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_task_create',
    'Create a Lark task with optional assignees, due date, tasklist. Wraps `lark-cli task +create` and `task +assign` for multi-assignee support.',
    {
      ...commonFlagsSchema,
      summary: z.string().describe('Task title / summary'),
      description: z.string().optional().describe('Task description'),
      due: z
        .string()
        .optional()
        .describe('Due date: ISO 8601 / date:YYYY-MM-DD / relative:+2d / ms timestamp'),
      assignee_open_ids: z
        .array(z.string())
        .optional()
        .describe('open_id list of assignees. First one set at create-time, additional ones added via task +assign.'),
      tasklist_id: z
        .string()
        .optional()
        .describe('Tasklist id or applink URL to attach the task to'),
      idempotency_key: z
        .string()
        .optional()
        .describe('Client token for idempotency (prevents duplicate creation)'),
    },
    async ({ identity, dry_run, summary, description, due, assignee_open_ids, tasklist_id, idempotency_key }) => {
      const createArgs = ['task', '+create', '--summary', summary];
      if (description) createArgs.push('--description', description);
      if (due) createArgs.push('--due', due);
      if (tasklist_id) createArgs.push('--tasklist-id', tasklist_id);
      if (idempotency_key) createArgs.push('--idempotency-key', idempotency_key);
      const firstAssignee = assignee_open_ids?.[0];
      if (firstAssignee) createArgs.push('--assignee', firstAssignee);

      const createResult = await callLarkCli({ args: createArgs, identity, dryRun: dry_run }, cfg);

      // If 2+ assignees and create succeeded, add the rest via task +assign --add
      const extras = (assignee_open_ids ?? []).slice(1);
      if (extras.length === 0 || dry_run || createResult.isError) {
        return createResult;
      }

      try {
        const text = createResult.content?.[0]?.type === 'text' ? createResult.content[0].text : '';
        const parsed = JSON.parse(text);
        const taskId =
          parsed?.data?.task?.guid ??
          parsed?.data?.guid ??
          parsed?.task?.guid ??
          parsed?.guid;
        if (!taskId) return createResult;

        const assignResult = await callLarkCli(
          { args: ['task', '+assign', '--task-id', taskId, '--add', extras.join(',')], identity, dryRun: dry_run },
          cfg,
        );
        const merged = {
          create: parsed,
          assign_extras: assignResult.content?.[0]?.type === 'text'
            ? safeParse(assignResult.content[0].text)
            : null,
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(merged, null, 2) }],
          isError: assignResult.isError,
        };
      } catch {
        return createResult;
      }
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
