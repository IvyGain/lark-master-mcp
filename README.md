# Lark Master MCP

> Complete Lark integration ecosystem for MCP clients (Claude Desktop, voiceOS, Claude Code)
> — 49 tools across 17 Lark domains, plus webhook infrastructure and web onboarding.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

## What is Lark Master?

Lark Master is a **monorepo** that provides a complete MCP (Model Context Protocol) integration for Lark/Feishu, enabling AI assistants to:

- 📅 Manage calendars and schedule meetings
- 💬 Send messages and cards to chats
- 📝 Create and edit Docs, Sheets, Slides, Wiki
- 📊 Manage Bitable (Base) databases
- ✉️ Send, read, and triage emails
- ✅ Handle approvals and tasks
- 🎥 Search VC meetings and retrieve notes
- 👥 Search contacts and organizational structure
- ...and much more

**Architecture**: This is a **thin wrapper** around the official [`@larksuite/cli`](https://github.com/larksuite/cli). All Lark API operations are delegated to `lark-cli`, making this project a stable, schema-validated bridge with minimal maintenance overhead.

---

## Monorepo Structure

```
lark-master-mcp/
├── apps/
│   ├── mcp-server/     # stdio MCP server (49 tools)
│   ├── web/            # Next.js landing page & OAuth callback (Vercel)
│   ├── webhook/        # Cloudflare Worker (event receiver)
│   └── brain/          # Claude Agent SDK brain (Container)
├── docs/               # Knowledge base, runbooks, architecture
├── tests/              # Playwright E2E tests
└── scripts/            # Utility scripts
```

### Components

| Component | Description | Deployment |
|-----------|-------------|------------|
| **mcp-server** | stdio MCP server with 49 Lark tools | npm package (npx) |
| **web** | Landing page with "Add to Lark" button + OAuth callback | Vercel |
| **webhook** | Receives Lark events, forwards to brain | Cloudflare Workers |
| **brain** | Claude Agent SDK brain for async workflows | Container (Fly.io / Cloud Run) |

---

## Quick Start

### For End Users (Using the MCP Server)

**Prerequisites**:
- Node.js 20+
- [`@larksuite/cli`](https://github.com/larksuite/cli) installed and configured
  ```bash
  npm install -g @larksuite/cli
  lark-cli config init --new  # Follow OAuth flow once
  ```

**Install**:

```bash
# Use directly via npx (recommended)
npx -y @ivygain/lark-master-mcp

# Or globally
npm install -g @ivygain/lark-master-mcp
```

**Configure Claude Desktop**:

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

Restart Claude Desktop. You'll see 49 Lark tools in the MCP tool list.

---

### For Developers (Building from Source)

```bash
# Clone the repo
git clone https://github.com/IvyGain/lark-master-mcp.git
cd lark-master-mcp

# Install dependencies (all workspaces)
npm install

# Build all apps
npm run build

# Type check all apps
npm run typecheck

# Run tests
npm test
```

**Individual app commands**:

```bash
# MCP Server
npm run mcp:dev        # Watch mode
npm run mcp:build      # Production build
npm run mcp:inspect    # Open MCP Inspector

# Web App
cd apps/web
npm run dev            # Start Next.js dev server (port 4000)
npm run build          # Production build

# Webhook Worker
cd apps/webhook
npm run dev            # Wrangler dev mode
npm run deploy         # Deploy to Cloudflare Workers

# Brain
cd apps/brain
npm run dev            # Watch mode
npm run start          # Production server
```

---

## Features

### 49 MCP Tools Across 17 Lark Domains

| Domain | Count | Key Tools |
|--------|------:|-----------|
| **Meta** | 6 | `lark_doctor`, `lark_raw`, `lark_auth_login_url`, profile management |
| **Calendar** | 4 | `lark_calendar_agenda`, `lark_calendar_event_create`, list events |
| **Messaging** | 4 | `lark_im_send_text`, `lark_im_send_card`, list chats |
| **Docs** | 2 | `lark_docs_create`, `lark_docs_get_content` |
| **Base (Bitable)** | 3 | `lark_base_create_app`, add/list records |
| **Drive** | 1 | `lark_drive_list_files` |
| **Contact** | 1 | `lark_contact_search_user` |
| **Sheets** | 4 | `lark_sheets_create`, append, read, get info |
| **Task** | 5 | Create, get, complete, reopen, comment on tasks |
| **Mail** | 4 | Send, triage, read, reply to emails |
| **Wiki** | 3 | `lark_wiki_create_node`, list spaces/nodes |
| **Approval** | 4 | `lark_approval_my_tasks`, approve, reject, get instance |
| **Slides** | 1 | `lark_slides_create` |
| **VC** | 3 | Search meetings, get notes, download recordings |
| **Minutes** | 1 | `lark_minutes_search` |
| **Whiteboard** | 2 | Query and update whiteboards |
| **Attendance** | 1 | `lark_attendance_user_tasks_query` |

**Total**: 49 tools, all with:
- `identity` parameter: `user` / `bot` / `auto` (maps to `lark-cli --as`)
- `dry_run` mode for safe testing

Full tool documentation: [`apps/mcp-server/README.md`](apps/mcp-server/README.md)

### Web Onboarding Flow

1. User clicks "Add to Lark" on landing page (`apps/web`)
2. OAuth consent flow initiated
3. User authorizes in Lark
4. Callback lands at `/api/lark/oauth/callback`
5. Tokens stored in user's local MCP config via `lark-cli`
6. Redirect to `/connected` page

**Deployment**: Vercel (auto-deploy from `main` branch)

### Event Handling (Webhook + Brain)

```
Lark Server → Cloudflare Worker → Durable Objects → Brain Container
                (webhook)           (conversation state)   (Claude Agent SDK)
```

- **Webhook** (`apps/webhook`): Receives Lark events (`/lark/event`), card actions, OAuth callbacks
- **Brain** (`apps/brain`): Claude Agent SDK brain that processes events using MCP tools
- **Durable Objects**: Maintains conversation state per Lark user/chat

**Deployment**:
- Webhook: Cloudflare Workers
- Brain: Container platform (Fly.io / Cloud Run)

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/lark-knowledge/`](docs/lark-knowledge/) | Lark ecosystem knowledge base (CLI, OAuth, SDK) |
| [`docs/architecture/`](docs/architecture/) | System architecture, sequence diagrams, data models |
| [`docs/runbook/`](docs/runbook/) | Deployment, incident response, secret rotation |
| [`apps/mcp-server/README.md`](apps/mcp-server/README.md) | MCP server installation & tool reference |
| [`CLAUDE.md`](CLAUDE.md) | Project instructions for Claude Code |
| [`AGENTS.md`](AGENTS.md) | Available CCAGI agents |

---

## Architecture

### Data Flow

```
┌─────────────────┐
│  Claude Desktop │  (or voiceOS / Claude Code)
│   MCP Client    │
└────────┬────────┘
         │ stdio
         ▼
┌─────────────────┐
│ lark-master-mcp │  (this project - MCP server)
│   (Node.js)     │
└────────┬────────┘
         │ spawn
         ▼
┌─────────────────┐
│  @larksuite/cli │  (official CLI tool)
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Lark Open API  │
└─────────────────┘
```

### Event Flow

```
┌─────────────┐          ┌───────────────────┐          ┌─────────────┐
│ Lark Server │ ─event─▶ │ Webhook (Worker)  │ ─HTTP─▶  │    Brain    │
└─────────────┘          │ + Durable Objects │          │ (Container) │
                         └───────────────────┘          └─────────────┘
                                   │                            │
                                   ▼                            ▼
                         ┌───────────────────┐          ┌─────────────┐
                         │   D1 Database     │          │  lark-cli   │
                         │ (conversation log)│          │  MCP tools  │
                         └───────────────────┘          └─────────────┘
```

---

## Configuration

### Environment Variables (MCP Server)

| Variable | Default | Description |
|----------|---------|-------------|
| `LARK_CLI_BIN` | `lark-cli` | Path to lark-cli binary |
| `LARK_MASTER_PROFILE_DIR` | `~/.lark-master` | Profile storage directory |
| `LARK_DEFAULT_IDENTITY` | `auto` | Default identity (`user`/`bot`/`auto`) |
| `LARK_DOMAIN` | (lark-cli default) | Lark/Feishu domain URL |

### Environment Variables (Webhook Worker)

Set as Cloudflare Worker secrets:

```bash
wrangler secret put LARK_APP_ID
wrangler secret put LARK_APP_SECRET
wrangler secret put LARK_VERIFICATION_TOKEN
wrangler secret put LARK_ENCRYPT_KEY
wrangler secret put BRAIN_URL  # URL of brain container
```

### Environment Variables (Brain)

```bash
ANTHROPIC_API_KEY=sk-ant-...     # Claude API key
LARK_CLI_BIN=/usr/local/bin/lark-cli
PORT=8080
```

---

## Testing

```bash
# Run all tests
npm test

# MCP server smoke tests
cd apps/mcp-server
npm test

# E2E tests (Playwright)
cd tests
npx playwright test
```

Current test coverage:
- MCP server: 3 smoke tests (stdio protocol, basic tool calls)
- E2E: OAuth flow, event handling (TODO)

---

## Deployment

### MCP Server (npm package)

```bash
cd apps/mcp-server
npm version patch  # Bump version
npm publish --access public
```

**Published as**: `@ivygain/lark-master-mcp`

### Web App (Vercel)

- **Auto-deploy**: Pushes to `main` branch auto-deploy to production
- **Manual deploy**: `cd apps/web && vercel --prod`

### Webhook (Cloudflare Workers)

```bash
cd apps/webhook
npm run deploy
```

### Brain (Container)

```bash
cd apps/brain
docker build -t lark-master-brain .
docker push <registry>/lark-master-brain:latest

# Deploy to Fly.io
fly deploy

# Or Cloud Run
gcloud run deploy lark-master-brain --image <registry>/lark-master-brain:latest
```

See [`docs/runbook/deploy.md`](docs/runbook/deploy.md) for detailed instructions.

---

## Roadmap

- [x] 49 MCP tools across 17 Lark domains
- [x] Web onboarding flow with OAuth
- [x] Webhook + brain event handling
- [ ] lark-cli Agent Skills integration (23 official skills)
- [ ] Comprehensive test suite (80%+ coverage)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Voice interface integration (voiceOS optimizations)
- [ ] Multi-tenant support
- [ ] Rate limiting and quota management

---

## Contributing

We welcome contributions! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

**Key areas for contribution**:
- Additional Lark domain coverage
- Test coverage improvements
- Documentation enhancements
- Performance optimizations
- Bug fixes

---

## License

MIT License - see [`LICENSE`](LICENSE) for details.

---

## Acknowledgments

- Built on top of [`@larksuite/cli`](https://github.com/larksuite/cli) (official Lark CLI)
- Powered by [Model Context Protocol](https://modelcontextprotocol.io/)
- Developed with [CCAGI SDK](https://github.com/IvyGain/ccagi-sdk)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/IvyGain/lark-master-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/IvyGain/lark-master-mcp/discussions)
- **Lark Open Platform**: [Documentation](https://open.larksuite.com/document)

---

**Made with ❤️ by the IvyGain team**
