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

| Category | Tool | Description |
|---|---|---|
| Meta | `lark_doctor` | Health check — lark-cli binary, active profile, auth status |
| Meta | `lark_auth_login_url` | Instructions to start `lark-cli config init --new` OAuth flow |
| Meta | `lark_profile_list` / `lark_profile_upsert` / `lark_profile_use` | Profile management |
| Meta | `lark_raw` | Escape hatch — call any `lark-cli` subcommand |
| Calendar | `lark_calendar_agenda` | Today's agenda for the user |
| Calendar | `lark_calendar_list` | List calendars |
| Calendar | `lark_calendar_events_list` | List events in a date range |
| Calendar | `lark_calendar_event_create` | Create a new event with attendees |
| Messaging | `lark_im_send_text` | Send plain text message |
| Messaging | `lark_im_send_card` | Send interactive card message |
| Messaging | `lark_im_list_chats` | List chats visible to the identity |
| Messaging | `lark_im_invite_bot_to_chat` | Invite a Bot app into an existing chat |
| Docs | `lark_docs_create` | Create a new Docx document |
| Docs | `lark_docs_get_content` | Fetch Docx blocks |
| Base | `lark_base_create_app` | Create a new Base (Bitable) app |
| Base | `lark_base_add_record` | Append a record to a table |
| Base | `lark_base_list_records` | List records from a table |
| Drive | `lark_drive_list_files` | List files in a folder |
| Contact | `lark_contact_search_user` | Search users by name / email |

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
