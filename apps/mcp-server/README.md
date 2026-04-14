# @ivygain/lark-master-mcp

> stdio MCP server that wraps [`@larksuite/cli`](https://github.com/larksuite/cli)
> so voiceOS / Claude Desktop / Claude Code / any MCP client can drive Lark
> (Messenger / Calendar / Docs / Base / Drive / Contact) via natural language.

## Install

```bash
# Use directly via npx (no install needed)
npx -y @ivygain/lark-master-mcp

# Or globally
npm install -g @ivygain/lark-master-mcp
lark-master-mcp
```

**Prerequisites**:

- Node.js 20+
- [`@larksuite/cli`](https://github.com/larksuite/cli) reachable on PATH
  (the server just shells out to `lark-cli`)
- A one-time Custom App registered in the
  [Lark Open Platform console](https://open.larksuite.com/app) —
  run `lark-cli config init --new` and follow the authorize URL

## Configure your MCP client

### voiceOS

Add to your voiceOS MCP config:

```json
{
  "mcpServers": {
    "lark-master": {
      "command": "npx",
      "args": ["-y", "@ivygain/lark-master-mcp"]
    }
  }
}
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lark-master": {
      "command": "npx",
      "args": ["-y", "@ivygain/lark-master-mcp"],
      "env": {
        "LARK_DOMAIN": "https://open.larksuite.com",
        "LARK_DEFAULT_IDENTITY": "auto"
      }
    }
  }
}
```

Restart Claude Desktop. Lark Master tools will appear in the MCP tool list.

## Tools

**49 tools across 17 Lark domains.** Full list:

| Domain | Count | Tools |
|---|---:|---|
| Meta | 6 | `lark_doctor`, `lark_raw`, `lark_auth_login_url`, `lark_profile_list` / `upsert` / `use` |
| Calendar | 4 | `lark_calendar_agenda`, `lark_calendar_list`, `lark_calendar_events_list`, `lark_calendar_event_create` |
| Messaging | 4 | `lark_im_send_text`, `lark_im_send_card`, `lark_im_list_chats`, `lark_im_invite_bot_to_chat` |
| Docs | 2 | `lark_docs_create`, `lark_docs_get_content` |
| Base | 3 | `lark_base_create_app`, `lark_base_add_record`, `lark_base_list_records` |
| Drive | 1 | `lark_drive_list_files` |
| Contact | 1 | `lark_contact_search_user` |
| Sheets | 4 | `lark_sheets_create`, `lark_sheets_append`, `lark_sheets_read`, `lark_sheets_info` |
| Task | 5 | `lark_task_create`, `lark_task_get_mine`, `lark_task_complete`, `lark_task_reopen`, `lark_task_comment` |
| Mail | 4 | `lark_mail_send`, `lark_mail_triage`, `lark_mail_read_message`, `lark_mail_reply` |
| Wiki | 3 | `lark_wiki_create_node`, `lark_wiki_spaces_list`, `lark_wiki_nodes_list` |
| Approval | 4 | `lark_approval_my_tasks`, `lark_approval_approve`, `lark_approval_reject`, `lark_approval_instance_get` |
| Slides | 1 | `lark_slides_create` |
| VC | 3 | `lark_vc_search_meetings`, `lark_vc_meeting_notes`, `lark_vc_recording` |
| Minutes | 1 | `lark_minutes_search` |
| Whiteboard | 2 | `lark_whiteboard_query`, `lark_whiteboard_update` |
| Attendance | 1 | `lark_attendance_user_tasks_query` |

Every tool accepts:

- `identity`: `user` / `bot` / `auto` — maps to `lark-cli --as`
- `dry_run`: when `true`, lark-cli prints the request without executing

## Environment variables

| Name | Default | Description |
|---|---|---|
| `LARK_CLI_BIN` | `lark-cli` | Path to lark-cli binary |
| `LARK_MASTER_PROFILE_DIR` | `~/.lark-master` | Where profiles are stored |
| `LARK_DEFAULT_IDENTITY` | `auto` | Default `--as` value |
| `LARK_DOMAIN` | (lark-cli default) | Lark / Feishu domain URL |
| `LARK_MASTER_REQUIRE_CONFIRM` | `false` | Reserved for future destructive-action gating |

## Development

```bash
cd apps/mcp-server
npm install
npm run build
npm run inspect   # opens MCP Inspector in the browser
```

## Architecture

```
MCP Client  ─stdio─▶  lark-master-mcp  ─spawn─▶  lark-cli  ─HTTP─▶  Lark Open API
```

All Lark operations are delegated to `lark-cli`. This server is a thin,
schema-validated, zod-typed bridge — no API logic of its own. The
[official lark-cli Agent Skills](https://github.com/larksuite/cli#agent-skills)
provide deeper workflow knowledge when used alongside this MCP.

## License

MIT
