import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuntimeConfig } from '../config.js';
import { registerCalendarTools } from './calendar.js';
import { registerMessagingTools } from './messaging.js';
import { registerDocsTools } from './docs.js';
import { registerBaseTools } from './base.js';
import { registerContactTools } from './contact.js';
import { registerDriveTools } from './drive.js';
import { registerSheetsTools } from './sheets.js';
import { registerTaskTools } from './task.js';
import { registerMailTools } from './mail.js';
import { registerWikiTools } from './wiki.js';
import { registerApprovalTools } from './approval.js';
import { registerSlidesTools } from './slides.js';
import { registerVcTools } from './vc.js';
import { registerMinutesTools } from './minutes.js';
import { registerWhiteboardTools } from './whiteboard.js';
import { registerAttendanceTools } from './attendance.js';
import { registerMetaTools } from './meta.js';

export function registerAllTools(server: McpServer, cfg: RuntimeConfig): void {
  registerCalendarTools(server, cfg);
  registerMessagingTools(server, cfg);
  registerDocsTools(server, cfg);
  registerBaseTools(server, cfg);
  registerContactTools(server, cfg);
  registerDriveTools(server, cfg);
  registerSheetsTools(server, cfg);
  registerTaskTools(server, cfg);
  registerMailTools(server, cfg);
  registerWikiTools(server, cfg);
  registerApprovalTools(server, cfg);
  registerSlidesTools(server, cfg);
  registerVcTools(server, cfg);
  registerMinutesTools(server, cfg);
  registerWhiteboardTools(server, cfg);
  registerAttendanceTools(server, cfg);
  registerMetaTools(server, cfg);
}
