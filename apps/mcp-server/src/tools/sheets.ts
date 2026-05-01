import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerSheetsTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_sheets_create',
    'Create a new Lark Sheets spreadsheet, optionally with a header row and initial data. Wraps `lark-cli sheets +create`.',
    {
      ...commonFlagsSchema,
      title: z.string().describe('Spreadsheet title'),
      folder_token: z.string().optional().describe('Parent folder token. Leave empty for root.'),
      headers: z
        .array(z.string())
        .optional()
        .describe('Optional header row (column names)'),
      initial_data: z
        .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
        .optional()
        .describe('Optional initial 2D data array'),
    },
    async ({ identity, dry_run, title, folder_token, headers, initial_data }) => {
      const args = ['sheets', '+create', '--title', title];
      if (folder_token) args.push('--folder-token', folder_token);
      if (headers && headers.length > 0) {
        args.push('--headers', JSON.stringify(headers));
      }
      if (initial_data && initial_data.length > 0) {
        args.push('--data', JSON.stringify(initial_data));
      }
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_sheets_append',
    'Append rows to an existing sheet. Wraps `lark-cli sheets +append`.',
    {
      ...commonFlagsSchema,
      spreadsheet_token: z.string().describe('Spreadsheet token (shtcn...)'),
      sheet_id: z.string().optional().describe('Target sheet id. Defaults to the first sheet (used together with --range).'),
      range: z
        .string()
        .describe('Append range. Forms: "<sheetId>!A1:D10", "A1:D10" (with sheet_id), or single cell like "C2"'),
      values: z
        .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
        .describe('2D array of cell values to append'),
    },
    async ({ identity, dry_run, spreadsheet_token, sheet_id, range, values }) => {
      const args = [
        'sheets',
        '+append',
        '--spreadsheet-token',
        spreadsheet_token,
        '--range',
        range,
        '--values',
        JSON.stringify(values),
      ];
      if (sheet_id) args.push('--sheet-id', sheet_id);
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );

  server.tool(
    'lark_sheets_read',
    'Read cell values from a spreadsheet range. Wraps `lark-cli sheets +read`.',
    {
      ...commonFlagsSchema,
      spreadsheet_token: z.string(),
      range: z.string().describe('A1 range, e.g. "Sheet1!A1:D10"'),
    },
    async ({ identity, dry_run, spreadsheet_token, range }) =>
      callLarkCli(
        {
          args: [
            'sheets',
            '+read',
            '--spreadsheet-token',
            spreadsheet_token,
            '--range',
            range,
          ],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );

  server.tool(
    'lark_sheets_info',
    'View spreadsheet metadata (sheets, sizes). Wraps `lark-cli sheets +info`.',
    {
      ...commonFlagsSchema,
      spreadsheet_token: z.string(),
    },
    async ({ identity, dry_run, spreadsheet_token }) =>
      callLarkCli(
        {
          args: ['sheets', '+info', '--spreadsheet-token', spreadsheet_token],
          identity,
          dryRun: dry_run,
        },
        cfg,
      ),
  );
}
