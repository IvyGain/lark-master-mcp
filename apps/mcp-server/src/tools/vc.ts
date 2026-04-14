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
      query: z.string().optional().describe('Free-text query'),
      start_time: z.string().optional().describe('Unix seconds'),
      end_time: z.string().optional().describe('Unix seconds'),
      owner_open_id: z.string().optional(),
    },
    async ({ identity, dry_run, query, start_time, end_time, owner_open_id }) => {
      const args = ['vc', '+search'];
      if (query) args.push('--query', query);
      if (start_time) args.push('--start-time', start_time);
      if (end_time) args.push('--end-time', end_time);
      if (owner_open_id) args.push('--owner', owner_open_id);
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
