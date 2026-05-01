# @ivygain/lark-master-mcp

> 49 Lark/Feishu tools for Claude Desktop, VoiceOS, and any MCP client.
> A thin, well-typed wrapper around the official [`@larksuite/cli`](https://github.com/larksuite/cli).

[![npm version](https://img.shields.io/npm/v/@ivygain/lark-master-mcp.svg)](https://www.npmjs.com/package/@ivygain/lark-master-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

## What it does

Exposes the Lark/Feishu API as 49 MCP tools across 17 domains: messaging, calendar, docs, sheets, slides, base (bitable), wiki, drive, mail, tasks, approvals, contacts, VC, minutes, attendance, whiteboard, and meta.

Auth and API calls are delegated to `@larksuite/cli`, so this server stays small and inherits OAuth/token management from the official tool.

---

## Prerequisites

1. **Node.js 20+**
2. **lark-cli** installed globally and authenticated:
   ```bash
   npm install -g @larksuite/cli
   lark-cli config init        # set App ID / App Secret of your Lark app
   lark-cli auth login --domain all
   ```
   The `auth login` step opens a browser for OAuth — approve once and you're done.

> **Multi-tenant note**: each user must run `lark-cli auth login` against a Lark app *they have permission to use*. The MCP server itself stores nothing; it just shells out to `lark-cli`, which manages tokens in `~/.lark-cli/`.

---

## Install

### As an MCP client dependency (recommended)

No install needed — point your MCP client at `npx`:

```bash
npx -y @ivygain/lark-master-mcp
```

### Global install

```bash
npm install -g @ivygain/lark-master-mcp
lark-master-mcp   # runs the stdio server
```

---

## Use with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop. You should see 49 `lark_*` tools available.

---

## Use with VoiceOS

In VoiceOS:

1. **パーソナライズ → エージェントモード → カスタム連携 → ＋追加**
2. Fill in:
   - **名前**: `Lark Master`
   - **起動コマンド**: `npx -y @ivygain/lark-master-mcp`
3. Click **接続**.

That's it. VoiceOS will spawn the MCP server on demand.

---

## Use with Claude Code

```bash
claude mcp add lark-master -- npx -y @ivygain/lark-master-mcp
```

---

## Tool reference (49 tools across 17 domains)

| Domain      | Count | Sample tools |
|-------------|------:|-------------|
| Meta        | 6 | `lark_doctor`, `lark_raw`, `lark_profile_*` |
| Messaging   | 4 | `lark_im_send_text`, `lark_im_send_card`, `lark_im_list_chats` |
| Calendar    | 4 | `lark_calendar_agenda`, `lark_calendar_event_create` |
| Task        | 5 | `lark_task_create` (with multi-assignee), `lark_task_get_mine` |
| Mail        | 4 | `lark_mail_send`, `lark_mail_triage`, `lark_mail_reply` |
| Docs        | 2 | `lark_docs_create`, `lark_docs_get_content` |
| Sheets      | 4 | `lark_sheets_create`, `lark_sheets_append`, `lark_sheets_read` |
| Slides      | 1 | `lark_slides_create` |
| Base        | 3 | `lark_base_create_app`, `lark_base_add_record` |
| Wiki        | 3 | `lark_wiki_create_node`, `lark_wiki_spaces_list` |
| Drive       | 1 | `lark_drive_list_files` |
| Contact     | 1 | `lark_contact_search_user` |
| Approval    | 4 | `lark_approval_my_tasks`, `lark_approval_approve` |
| VC          | 3 | `lark_vc_search_meetings`, `lark_vc_meeting_notes` |
| Minutes     | 1 | `lark_minutes_search` |
| Whiteboard  | 2 | `lark_whiteboard_query`, `lark_whiteboard_update` |
| Attendance  | 1 | `lark_attendance_user_tasks_query` |

Every tool accepts:
- `identity`: `user` | `bot` | `auto` (maps to `lark-cli --as`)
- `dry_run`: `true` to print the underlying lark-cli command without executing

---

## Configuration

The server reads no secrets directly. All auth flows through `lark-cli`. You can override the binary path or default identity via env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| `LARK_CLI_BIN` | `lark-cli` | Path to the `lark-cli` executable |
| `LARK_DEFAULT_IDENTITY` | `auto` | Default `--as` value (`user` / `bot` / `auto`) |
| `LARK_DOMAIN` | (lark-cli default) | Override Lark/Feishu domain |
| `LARK_MASTER_PROFILE_DIR` | `~/.lark-master` | Where to store profile metadata |

---

## Security

- **No secrets in the package**: this MCP server contains no API keys, tokens, or App IDs. All credentials are managed by `lark-cli` in your home directory.
- **Local-only by default**: stdio transport — no network listeners, no inbound traffic.
- **Per-user OAuth**: each user authenticates against their own Lark account.
- **Open source**: MIT licensed, source on [GitHub](https://github.com/IvyGain/lark-master-mcp).

If you find a vulnerability, please open an issue at [github.com/IvyGain/lark-master-mcp/issues](https://github.com/IvyGain/lark-master-mcp/issues).

---

## Troubleshooting

**`MCP error -32000: Connection closed`** in VoiceOS / Claude Desktop:
1. Run `lark-cli doctor` — it should show `ok: true`. If not, fix the failing check.
2. If `lark-cli` itself isn't installed: `npm install -g @larksuite/cli`.
3. If not authenticated: `lark-cli auth login --domain all`.

**Tool returns `(no logged-in users)`**: run `lark-cli auth login --domain all` and approve in the browser.

**A tool's flag seems to be silently ignored**: please open an issue with the tool name and the input you sent. The wrapper validates inputs but `lark-cli` flag names occasionally change between versions.

---

## Development

```bash
git clone https://github.com/IvyGain/lark-master-mcp.git
cd lark-master-mcp
npm install
npm run mcp:build      # builds apps/mcp-server
npm run mcp:dev        # watch mode
```

Test locally without publishing:

```bash
node /absolute/path/to/lark-master-mcp/apps/mcp-server/build/index.js
```

---

## License

MIT — see [LICENSE](./LICENSE).
