import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { probeLarkCli } from '../exec/lark-cli.js';
import { getActiveProfile, listProfiles, setActiveProfile, upsertProfile } from '../auth/profile.js';
import { callLarkCli, commonFlagsSchema, ok, fail } from './shared.js';

export function registerMetaTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_doctor',
    'Health check: lark-cli binary, version, active profile, auth status.',
    async () => {
      const probe = await probeLarkCli(cfg);
      const profile = await getActiveProfile(cfg);
      const auth = await callLarkCli({ args: ['auth', 'status'] }, cfg);
      const summary = {
        larkCli: probe,
        activeProfile: profile,
        authStatusOk: !auth.isError,
      };
      return ok(summary, 'lark_doctor', 0);
    },
  );

  server.tool(
    'lark_raw',
    'Escape hatch: call any lark-cli subcommand. Use only when no dedicated tool exists.',
    {
      ...commonFlagsSchema,
      args: z
        .array(z.string())
        .min(1)
        .describe('argv array passed directly to lark-cli (without --format)'),
      page_all: z.boolean().optional(),
    },
    async ({ identity, dry_run, args, page_all }) =>
      callLarkCli({ args, identity, dryRun: dry_run, pageAll: page_all }, cfg),
  );

  server.tool(
    'lark_auth_login_url',
    'Start lark-cli OAuth login. Prints the authorize URL for the user to open in a browser. Wraps `lark-cli config init --new`.',
    async () => {
      // lark-cli config init --new blocks until user visits URL.
      // We cannot block inside an MCP tool call, so emit instructions instead.
      return ok(
        {
          hint: 'Run `lark-cli config init --new` in a terminal to start the OAuth flow.',
          docs: 'docs/lark-knowledge/cli/official-skills.md',
          note: 'The lark-cli process will print an authorize URL. Open it in a browser, approve, and the lark-cli will capture the token.',
        },
        'lark_auth_login_url',
        0,
      );
    },
  );

  server.tool(
    'lark_profile_list',
    'List lark-master-mcp profiles.',
    async () => {
      const profiles = await listProfiles(cfg);
      return ok({ profiles, count: profiles.length }, 'lark_profile_list', 0);
    },
  );

  server.tool(
    'lark_profile_upsert',
    'Create or update a lark-master profile.',
    {
      name: z.string().min(1).describe('Profile name (e.g. "personal", "work")'),
      domain: z.string().optional().describe('Lark domain URL'),
      notes: z.string().optional(),
      activate: z.boolean().optional().default(true),
    },
    async ({ name, domain, notes, activate }) => {
      const profile = await upsertProfile(cfg, { name, domain, notes }, activate ?? true);
      return ok({ profile, activated: activate ?? true }, 'lark_profile_upsert', 0);
    },
  );

  server.tool(
    'lark_profile_use',
    'Switch the active profile.',
    {
      name: z.string().min(1),
    },
    async ({ name }) => {
      try {
        const profile = await setActiveProfile(cfg, name);
        return ok({ active: profile }, 'lark_profile_use', 0);
      } catch (err) {
        return fail((err as Error).message);
      }
    },
  );
}
