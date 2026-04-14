# Changelog

All notable changes to `@ivygain/lark-master-mcp` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-04-14

### Added

- Initial public release.
- stdio MCP server built on `@modelcontextprotocol/sdk`, distributable as
  `npx @ivygain/lark-master-mcp`.
- 49 tools across 17 Lark domains, wrapping `@larksuite/cli`:
  - **Calendar** (4): agenda, list, events_list, event_create
  - **Messaging** (4): send_text, send_card, list_chats, invite_bot_to_chat
  - **Docs** (2): create, get_content
  - **Base** (3): create_app, add_record, list_records
  - **Contact** (1): search_user
  - **Drive** (1): list_files
  - **Sheets** (4): create, append, read, info
  - **Task** (5): create, get_mine, complete, reopen, comment
  - **Mail** (4): send, triage, read_message, reply
  - **Wiki** (3): create_node, spaces_list, nodes_list
  - **Approval** (4): my_tasks, approve, reject, instance_get
  - **Slides** (1): create
  - **VC** (3): search_meetings, meeting_notes, recording
  - **Minutes** (1): search
  - **Whiteboard** (2): query, update
  - **Attendance** (1): user_tasks_query
  - **Meta** (6): doctor, raw, auth_login_url, profile list/upsert/use
- `lark-cli` spawn wrapper with identity (`--as user|bot|auto`), shortcut
  command detection, and JSON result parsing.
- Profile store at `~/.lark-master/profile.json` with 600-mode permissions.
- Smoke test scaffolding with vitest spawning the stdio server.
- README with voiceOS / Claude Desktop configuration snippets.
