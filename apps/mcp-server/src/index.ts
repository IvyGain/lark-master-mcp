#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { registerAllTools } from './tools/index.js';

const PACKAGE_NAME = '@ivygain/lark-master-mcp';
const PACKAGE_VERSION = '0.2.6';

async function main(): Promise<void> {
  const cfg = loadConfig();

  const server = new McpServer({
    name: 'lark-master',
    version: PACKAGE_VERSION,
  });

  registerAllTools(server, cfg);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup to stderr so it doesn't interfere with stdio protocol on stdout
  process.stderr.write(
    `[${PACKAGE_NAME}@${PACKAGE_VERSION}] stdio MCP server ready ` +
      `(larkCli=${cfg.larkCliBin}, profileDir=${cfg.profileDir}, ` +
      `identity=${cfg.defaultIdentity}, domain=${cfg.domain ?? '(default)'})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[lark-master-mcp] fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
