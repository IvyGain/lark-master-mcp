import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema, jsonParam } from './shared.js';

export function registerCalendarTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_calendar_agenda',
    'Get the current user agenda (today by default). Wraps `lark-cli calendar +agenda`.',
    {
      ...commonFlagsSchema,
    },
    async ({ identity, dry_run }) =>
      callLarkCli(
        { args: ['calendar', '+agenda'], identity, dryRun: dry_run },
        cfg,
      ),
  );

  server.tool(
    'lark_calendar_list',
    'List calendars the caller has access to. Wraps `lark-cli calendar calendars list`.',
    {
      ...commonFlagsSchema,
      page_all: z.boolean().optional().describe('全ページを自動取得'),
    },
    async ({ identity, dry_run, page_all }) =>
      callLarkCli(
        {
          args: ['calendar', 'calendars', 'list'],
          identity,
          dryRun: dry_run,
          pageAll: page_all,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_calendar_events_list',
    'List events in a calendar within a time range. Wraps `lark-cli calendar events instance_view`.',
    {
      ...commonFlagsSchema,
      calendar_id: z
        .string()
        .default('primary')
        .describe('Calendar id. Use "primary" for the user default calendar'),
      start_time: z
        .string()
        .describe('Start time as unix seconds string, e.g. "1700000000"'),
      end_time: z
        .string()
        .describe('End time as unix seconds string, e.g. "1700086400"'),
    },
    async ({ identity, dry_run, calendar_id, start_time, end_time }) =>
      callLarkCli(
        {
          args: [
            'calendar',
            'events',
            'instance_view',
            '--params',
            jsonParam({ calendar_id, start_time, end_time }),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_calendar_event_create',
    'Create a new calendar event. Wraps `lark-cli calendar events create`.',
    {
      ...commonFlagsSchema,
      calendar_id: z.string().default('primary'),
      summary: z.string().describe('Event title'),
      description: z.string().optional(),
      start_time: z.string().describe('Unix seconds string'),
      end_time: z.string().describe('Unix seconds string'),
      timezone: z.string().optional().default('Asia/Tokyo'),
      attendee_open_ids: z
        .array(z.string())
        .optional()
        .describe('List of attendee open_id to invite'),
    },
    async ({
      identity,
      dry_run,
      calendar_id,
      summary,
      description,
      start_time,
      end_time,
      timezone,
      attendee_open_ids,
    }) => {
      const body: Record<string, unknown> = {
        summary,
        description,
        start_time: { timestamp: start_time, timezone },
        end_time: { timestamp: end_time, timezone },
      };
      if (attendee_open_ids && attendee_open_ids.length > 0) {
        body.attendees = attendee_open_ids.map((open_id) => ({
          type: 'user',
          user_id: open_id,
          is_optional: false,
        }));
      }
      return callLarkCli(
        {
          args: [
            'calendar',
            'events',
            'create',
            '--params',
            jsonParam({ calendar_id }),
            '--data',
            jsonParam(body),
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      );
    },
  );
}
