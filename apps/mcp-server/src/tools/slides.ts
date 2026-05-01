import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { callLarkCli, commonFlagsSchema } from './shared.js';

export function registerSlidesTools(server: McpServer, cfg: RuntimeConfig): void {
  server.tool(
    'lark_slides_create',
    'Create a new Lark Slides presentation. Wraps `lark-cli slides +create`.',
    {
      ...commonFlagsSchema,
      title: z.string().describe('Presentation title'),
      slides: z
        .array(z.string())
        .optional()
        .describe('Slide content as XML strings (max 10 slides; for more pages, create first then add via xml_presentation.slide.create)'),
    },
    async ({ identity, dry_run, title, slides }) => {
      const args = ['slides', '+create', '--title', title];
      if (slides && slides.length > 0) {
        args.push('--slides', JSON.stringify(slides));
      }
      return callLarkCli({ args, identity, dryRun: dry_run }, cfg);
    },
  );
}
