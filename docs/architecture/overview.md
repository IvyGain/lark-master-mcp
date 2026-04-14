# Architecture Overview

`lark-master-mcp` is a monorepo that lets a user drive Lark (Feishu) from two
independent entry points:

1. **Voice on desktop** — voiceOS speaks to an MCP server running locally.
2. **Phone / Lark client** — a message to the Lark bot is handled by a
   Cloudflare Worker which delegates to a Node.js "brain" container.

Both entry points ultimately shell out to `@larksuite/cli` (`lark-cli`) to hit
Lark Open API.

---

## 🧩 Apps

| Path | Runtime | Purpose |
|------|---------|---------|
| `apps/mcp-server/` | Local Node (stdio) | MCP server exposing 41 Lark tools across calendar / im / docs / base / drive / contact / sheets / task / mail / wiki / approval / meta. Published as `@ivygain/lark-master-mcp` with bin `lark-master-mcp`. Used by voiceOS and Claude Desktop. |
| `apps/webhook/` | Cloudflare Worker (Hono) | Edge entry for the Lark bot. Routes `/lark/event`, `/lark/card-action`, `/lark/oauth/callback`, `/healthz`. Owns the D1 database, KV cache, and the `ConversationDO` Durable Object. |
| `apps/brain/` | Node.js container (Hono) | The reasoning core. Exposes `POST /invoke`. Runs `@anthropic-ai/claude-agent-sdk` `query()` with a Lark-specific system prompt, a restricted `Bash` tool (lark-cli only) and a child custom stdio MCP exposing `send_reply_text`, `send_reply_card`, `log_step`. |
| `apps/web/` | Next.js 15 on Vercel | Marketing landing at `/`, plus `/connected` post-OAuth page. Hosts the "Add to Lark" install button. |

---

## ⚙️ High-level diagram

```
                                  ┌────────────────────────────┐
                                  │        voiceOS / Claude    │
                                  │           Desktop          │
                                  └──────────────┬─────────────┘
                                                 │ stdio
                                                 ▼
                                  ┌────────────────────────────┐
                                  │ apps/mcp-server            │
                                  │  (local Node process)      │
                                  │  41 tools → lark-cli       │
                                  └──────────────┬─────────────┘
                                                 │ spawn
                                                 ▼
                                           @larksuite/cli
                                                 │
 ┌───────────────────┐                           ▼
 │   Phone / Lark    │                    Lark Open API
 │     client        │                           ▲
 └─────────┬─────────┘                           │ spawn
           │ HTTPS                               │
           ▼                                     │
 ┌───────────────────────────┐                   │
 │   apps/webhook (Worker)   │                   │
 │   Hono routes:            │                   │
 │   /lark/event             │                   │
 │   /lark/card-action       │                   │
 │   /lark/oauth/callback    │                   │
 │   /healthz                │                   │
 │                           │                   │
 │   Bindings:               │                   │
 │   - D1: DB                │                   │
 │   - KV: CACHE             │                   │
 │   - DO: CONVERSATION      │                   │
 └─────────┬─────────────────┘                   │
           │ fetch + shared secret               │
           ▼                                     │
 ┌───────────────────────────┐                   │
 │   apps/brain (Container)  │                   │
 │   POST /invoke (Hono)     │                   │
 │   runBrain() ->           │                   │
 │     Claude Agent SDK      │                   │
 │   Tools:                  │                   │
 │     - Bash (lark-cli)     │───────────────────┘
 │     - child MCP:          │
 │         send_reply_text   │
 │         send_reply_card   │
 │         log_step          │
 └───────────────────────────┘

 ┌───────────────────────────┐
 │  apps/web (Next.js 15)    │
 │  / and /connected         │
 │  "Add to Lark" button     │
 │  Vercel                   │
 └───────────────────────────┘
```

---

## 🗣 Flow A: voiceOS → mcp-server

1. voiceOS (or Claude Desktop) launches the MCP server process via its
   `lark-master-mcp` binary and speaks MCP over stdio.
2. The agent picks a tool (e.g. `calendar_event_create`) and calls it.
3. `apps/mcp-server` validates inputs and spawns `lark-cli ...` as a child
   process using the user's locally-auth'd CLI session
   (`lark-cli auth status` currently reports App ID `cli_a932b917a8f89e18`,
   bot-only; user login is TODO).
4. stdout is parsed and returned as the MCP tool result.
5. No cloud infrastructure is touched. No D1, no Worker.

---

## 🧠 Flow B: Phone → Cloud

1. A user sends a text to the Lark bot from their phone.
2. Lark posts a JSON event to the Worker at `/lark/event`.
3. The Worker verifies the Lark signature, decrypts (if `LARK_ENCRYPT_KEY` is
   set), and routes by `header.event_type`.
4. For a message event, the Worker derives a `session_id` from
   `(tenant_key, chat_id, thread_id | open_id)` and forwards the payload to
   the `ConversationDO` instance for that id.
5. The Durable Object is the single-writer for that conversation. It:
   - appends the user message into `messages` in D1,
   - calls the brain container at `BRAIN_URL` (`POST /invoke`) with the
     `BRAIN_SHARED_SECRET` header,
   - awaits the brain's acknowledgement.
6. Inside the brain, `runBrain()` invokes `@anthropic-ai/claude-agent-sdk`
   `query()`. The SDK can:
   - run `Bash` but only `lark-cli …` invocations (via a policy prompt and
     `LARK_CLI_BIN`),
   - call the small child stdio MCP (`dist/tools/mcp-server.js`) whose three
     tools send replies or log steps.
7. When the agent chooses `send_reply_card`, the child MCP calls `lark-cli im
   send-card ...`, which posts the final message back to the user in Lark.
8. The DO marks the turn complete, persists the assistant message, releases
   the lock, and returns 200 to the Worker.

---

## Persistence

| Store | Lives in | Owner | Contents |
|-------|----------|-------|----------|
| D1 `lark-master` | `apps/webhook` (binding `DB`) | Worker | `users`, `tokens`, `conversations`, `messages`, `audit`. Schema in `apps/webhook/migrations/0001_init.sql`. |
| KV `CACHE` | `apps/webhook` (binding `CACHE`) | Worker | Short-lived caches (e.g. Lark app access token). |
| Durable Object `ConversationDO` | `apps/webhook` (binding `CONVERSATION`) | Worker | Per-`session_id` serialization. Holds in-flight turn state and forwards to brain. |
| Container FS | `apps/brain` | Brain | Stateless. `@larksuite/cli` is installed globally during image build. |
| Local CLI profile | user's machine | voiceOS flow only | `~/.lark-cli`. Not used by the cloud flow. |

---

## Why two entry points?

The MCP server is optimized for low-latency local voice control. The cloud
path is optimized for multi-tenant Lark installs and needs to survive the
Worker's short CPU budget, which is exactly why the heavy Claude Agent SDK
loop runs in a long-lived container instead of in the Worker.

Both paths converge on `@larksuite/cli`, so tool coverage in one path is
automatically feasible in the other.

---

## Related documents

- `docs/architecture/sequence-phone-to-cloud.md` — per-turn sequence diagram
- `docs/architecture/data-model.md` — D1 and Durable Object storage
- `docs/architecture/security.md` — threat model
- `docs/runbook/deploy.md` — first-time deploy checklist
