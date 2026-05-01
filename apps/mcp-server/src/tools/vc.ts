import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerVcTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_vc_search_meetings',
    'Search video meeting records with at least one filter. Wraps `lark-cli vc +search`.',
    {
      ...commonFlagsSchema,
      query: z.string().optional().describe('Search keyword'),
      start: z
        .string()
        .optional()
        .describe('Start time (ISO 8601 or YYYY-MM-DD, e.g. "2026-03-24T00:00+09:00")'),
      end: z
        .string()
        .optional()
        .describe('End time (ISO 8601 or YYYY-MM-DD, e.g. "2026-03-25")'),
      organizer_open_ids: z
        .array(z.string())
        .optional()
        .describe('Organizer open_id list'),
      participant_open_ids: z
        .array(z.string())
        .optional()
        .describe('Participant open_id list'),
    },
    async ({ identity, dry_run, query, start, end, organizer_open_ids, participant_open_ids }) => {
      const args = ['vc', '+search'];
      if (query) args.push('--query', query);
      if (start) args.push('--start', start);
      if (end) args.push('--end', end);
      if (organizer_open_ids?.length) args.push('--organizer-ids', organizer_open_ids.join(','));
      if (participant_open_ids?.length) args.push('--participant-ids', participant_open_ids.join(','));
      return callLarkCli({ args, identity: identity ?? 'user', dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_vc_meeting_notes',
    'Fetch meeting notes by meeting-id / minute-token / calendar-event-id. Wraps `lark-cli vc +notes`.',
    {
      ...commonFlagsSchema,
      meeting_ids: z.array(z.string()).optional(),
      minute_tokens: z.array(z.string()).optional(),
      calendar_event_ids: z.array(z.string()).optional(),
    },
    async ({ identity, dry_run, meeting_ids, minute_tokens, calendar_event_ids }) => {
      const args = ['vc', '+notes'];
      if (meeting_ids?.length) args.push('--meeting-ids', meeting_ids.join(','));
      if (minute_tokens?.length) args.push('--minute-tokens', minute_tokens.join(','));
      if (calendar_event_ids?.length)
        args.push('--calendar-event-ids', calendar_event_ids.join(','));
      return callLarkCli({ args, identity: identity ?? 'user', dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_vc_recording',
    'Get minute_token from meeting-ids or calendar-event-ids. Wraps `lark-cli vc +recording`.',
    {
      ...commonFlagsSchema,
      meeting_ids: z.array(z.string()).optional(),
      calendar_event_ids: z.array(z.string()).optional(),
    },
    async ({ identity, dry_run, meeting_ids, calendar_event_ids }) => {
      const args = ['vc', '+recording'];
      if (meeting_ids?.length) args.push('--meeting-ids', meeting_ids.join(','));
      if (calendar_event_ids?.length)
        args.push('--calendar-event-ids', calendar_event_ids.join(','));
      return callLarkCli({ args, identity: identity ?? 'user', dryRun: dry_run }, cfg);
    },
  );
}
