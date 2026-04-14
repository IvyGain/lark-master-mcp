# Data Model

Persistence for the cloud path lives entirely inside `apps/webhook`.
The brain container is stateless. The source of truth for the schema is
`apps/webhook/migrations/0001_init.sql`. Bindings are declared in
`apps/webhook/wrangler.jsonc`:

| Binding | Kind | Purpose |
|---------|------|---------|
| `DB` | D1 | Relational store for users, tokens, conversations, messages, audit. |
| `CACHE` | KV | Short-lived caches (e.g. app access token, dedupe keys). |
| `CONVERSATION` | Durable Object | Per-`session_id` single-writer for a conversation turn. |

---

## D1: `lark-master`

Five tables. Exact column lists live in the migration; the table below is
the semantic summary.

### `users`

One row per Lark user that has interacted with the bot or completed OAuth.

- Primary key: `open_id` (stable per app).
- Secondary: `tenant_key`, `union_id`.
- Profile fields populated from `contact.user.get` when available.
- Rows are upserted on first message.

### `tokens`

Per-user OAuth tokens after the "Add to Lark" flow in `apps/web`.

- One row per `(open_id, scope_set)`.
- Columns: `access_token`, `refresh_token`, `expires_at`, `scope`,
  `created_at`, `updated_at`.
- **Encryption status: TODO.** Currently the values are stored as plaintext
  UTF-8. Before production, wrap write/read with AES-GCM keyed off a Worker
  secret (e.g. `TOKEN_ENCRYPTION_KEY`, 32 bytes base64). See
  `docs/architecture/security.md`.

### `conversations`

One row per `session_id` (derived from `(tenant_key, chat_id, thread_id |
open_id)`).

- Tracks `created_at`, `last_message_at`, `turn_count`,
  `status` (`active` | `paused` | `archived`).
- Used by the DO to hydrate recent context and by dashboards to list active
  threads.

### `messages`

Append-only message log.

- Columns: `id`, `session_id`, `role` (`user` | `assistant` | `tool` |
  `system`), `content`, `tool_name`, `tool_input`, `tool_output`,
  `created_at`.
- Written twice per turn: once for the user message (before the brain
  call), once for the final assistant reply (after the brain returns).
- Optional: `log_step` from the child MCP can persist `tool` rows for
  observability.

### `audit`

Security- and operator-facing events.

- Signature verification failures, OAuth callbacks, token refreshes, rate
  limits, secret rotations.
- Intended to be drained to Logpush or queried via `wrangler d1 execute`.

---

## Durable Object: `ConversationDO`

One instance per `session_id`. The DO is the single-writer for a
conversation, which gives us serialization without explicit locks.

### Storage keys

| Key | Value | Notes |
|-----|-------|-------|
| `session_id` | `string` | Identity of this DO, matches the name used in `idFromName`. |
| `last_event_id` | `string` | For Lark retry dedupe. |
| `in_flight` | `boolean` | Set while a brain call is outstanding. Rejects new events with 429 if the caller wants fast-fail. |
| `pending_interim` | `object` | Scratchpad if we decide to send a "Thinking…" placeholder. |
| `history_cursor` | `number` | Pointer into D1 `messages` so we don't re-hydrate on every turn. |

### Concurrency guarantees

- Cloudflare guarantees a single JavaScript turn at a time per DO instance.
- Two phone messages in the same thread therefore serialize through the same
  DO and cannot interleave brain calls.
- Cross-thread parallelism is unbounded — two different users hit two
  different DOs.

---

## What is *not* stored

- `apps/brain` has no database. Its only mutable state is the running Claude
  Agent SDK tool loop for the current request.
- `apps/mcp-server` has no database. It relies on `~/.lark-cli` on the local
  machine.
- We do not mirror Lark messages outside D1. The user's Lark inbox is the
  product's source of truth for conversation history; D1 is our audit copy.

---

## Migration workflow

```bash
# Apply a migration locally
wrangler d1 migrations apply lark-master --local

# Apply to the remote D1
wrangler d1 migrations apply lark-master --remote
```

New migrations must be added as `apps/webhook/migrations/000N_*.sql` and
committed. Never edit `0001_init.sql` after deploy.

## Related documents

- `docs/architecture/overview.md`
- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
