import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerAttendanceTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_attendance_user_tasks_query',
    'Query attendance (clock-in) records for users within a date range. Wraps `lark-cli attendance user_tasks query`.',
    {
      ...commonFlagsSchema,
      user_ids: z.array(z.string()).min(1).describe('Target user open_id list'),
      check_date_from: z.string().describe('YYYYMMDD'),
      check_date_to: z.string().describe('YYYYMMDD'),
      need_overtime_result: z.boolean().optional(),
    },
    async ({
      identity,
      dry_run,
      user_ids,
      check_date_from,
      check_date_to,
      need_overtime_result,
    }) => {
      const data: Record<string, unknown> = {
        user_ids,
        check_date_from,
        check_date_to,
      };
      if (need_overtime_result !== undefined) data.need_overtime_result = need_overtime_result;
      return callLarkCli(
        {
          args: [
            'attendance',
            'user_tasks',
            'query',
            '--params',
            jsonParam({ employee_type: 'open_id' }),
            '--data',
            jsonParam(data),
          ],
          identity: identity ?? 'bot',
          dryRun: dry_run,
        },
        cfg,
      );
    },
  );
}
