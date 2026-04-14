#!/usr/bin/env node
import('../dist/index.js').catch((err) => {
  process.stderr.write(`[lark-master-mcp] failed to start: ${err?.stack ?? err}\n`);
  process.exit(1);
});
