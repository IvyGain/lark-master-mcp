# Security: Threat Model Snapshot

Scope: `apps/webhook` (Cloudflare Worker) and `apps/brain` (Node container).
The local `apps/mcp-server` path inherits the user's desktop trust boundary
and is out of scope for cloud threats.

## Trust boundaries

```
 Internet
    │
    ▼
 [Lark Open Platform]     <- signs events with LARK_VERIFICATION_TOKEN
    │
    ▼
 [Worker: apps/webhook]   <- verifies signature, decrypts, routes
    │   ConversationDO    <- single-writer per session
    │   D1, KV            <- tenant data at rest
    ▼
 [Brain: apps/brain]      <- Bearer BRAIN_SHARED_SECRET from Worker only
    │
    ▼
 [lark-cli]               <- uses app token to hit Lark Open API
    │
    ▼
 [Lark Open API]
```

## Controls currently in place

### 1. Lark signature verification

- Every `/lark/event` and `/lark/card-action` request recomputes HMAC over
  `timestamp + nonce + raw body` with `LARK_VERIFICATION_TOKEN`.
- Requests failing verification are 401'd and logged to `audit`.
- When `LARK_ENCRYPT_KEY` is set, the inner payload is AES-decrypted before
  parsing; decryption errors also 401.

### 2. Worker → Brain shared secret

- `POST /invoke` on the brain requires
  `Authorization: Bearer ${BRAIN_SHARED_SECRET}`.
- The same secret is set in the Worker (as a `wrangler secret`) and in the
  container environment. Mismatched secrets are 401'd.
- Because the brain is network-reachable, this is the *only* thing
  preventing a public actor from invoking the Claude Agent SDK loop and
  billing our Anthropic account. Treat it like a root credential.

### 3. DO single-writer as implicit rate limiter

- All turns for a given `session_id` serialize through one DO instance, so a
  single abusive thread can only consume one Claude Agent SDK loop at a time.
- Combined with a Lark per-bot message rate limit, this is currently the
  only rate-limit layer. A global ceiling per tenant should be added later.

### 4. Destructive-action confirmation

- The Lark-specific system prompt in `runBrain()` instructs the agent to
  emit a confirmation card (via `send_reply_card`) before running any
  destructive `lark-cli` subcommand (e.g. deleting a base record, canceling
  a meeting). The user has to click "Confirm" which comes back through
  `/lark/card-action`.
- This is a soft control in the prompt today; a hardened version would also
  deny-list destructive subcommands in the brain's `Bash` tool policy.

### 5. Secrets only in Worker/Container secret stores

- All 7 Worker secrets are stored via `wrangler secret put`, never in
  `wrangler.jsonc`.
- Brain secrets are injected as container env vars at deploy time
  (`fly secrets set`, or the equivalent on Cloudflare Containers when GA).
- No secrets in the git repo. `.env.example` files, if any, must stay empty.

## Known gaps / TODO

### A. Token encryption at rest

- `tokens.access_token` and `tokens.refresh_token` are currently stored in
  D1 as plaintext UTF-8. If D1 leaks, every connected user's Lark session is
  compromised.
- Plan: add a Worker secret `TOKEN_ENCRYPTION_KEY` (32 random bytes,
  base64). Wrap `tokens` writes with AES-GCM-256 using a random 12-byte IV
  stored alongside the ciphertext. Decrypt on read. Migration can be done
  lazily: re-encrypt on next refresh.

### B. Destructive-action hardening

- The agent prompt asks for confirmation; no structural block prevents it
  from issuing `lark-cli base record delete` directly. Add a subcommand
  allow-list inside the brain's `Bash` tool invocation.

### C. Per-tenant rate limiting

- The DO serializes one thread. Two abusive threads in the same tenant
  currently cost O(threads) concurrent brain calls.
- Plan: a KV-backed token bucket keyed by `tenant_key`, checked in the DO
  before calling the brain.

### D. Audit drain

- `audit` rows stay in D1 forever. Add a scheduled Worker (cron trigger) to
  export them to R2 or Logpush weekly.

## Secret rotation

Covered in detail in `docs/runbook/rotate-secrets.md`. Summary:

| Secret | Owner | Downtime? |
|--------|-------|-----------|
| `LARK_VERIFICATION_TOKEN` | Lark Dev Console + Worker | Flip both within ~30s. |
| `LARK_ENCRYPT_KEY` | Lark Dev Console + Worker | Flip both within ~30s. |
| `LARK_APP_SECRET` | Lark Dev Console + Worker | Flip both; lark-cli may need re-auth. |
| `BRAIN_SHARED_SECRET` | Worker + Brain env | Dual-accept window via two Worker env vars. |
| `ANTHROPIC_API_KEY` | Brain env | Hot swap. |

## Threats and mitigations

| Threat | Mitigation |
|--------|------------|
| Attacker posts forged `/lark/event` | Signature verification with `LARK_VERIFICATION_TOKEN`. |
| Attacker hits `/invoke` on brain directly | `BRAIN_SHARED_SECRET` bearer check. |
| Attacker replays a Lark event | DO dedupe by `event_id` + `session_id`. |
| Malicious LLM tool-call sequence | System prompt restricts `Bash` to lark-cli; card-confirmation for destructive ops. |
| D1 leak | (Pending) AES-GCM on `tokens` columns. |
| OAuth callback CSRF | State parameter validated in `/lark/oauth/callback`, tied to KV-stored nonce. |
| Secret sprawl | All secrets via `wrangler secret put` / container env; none in `wrangler.jsonc` or git. |

## Related documents

- `docs/architecture/overview.md`
- `docs/architecture/data-model.md`
- `docs/runbook/rotate-secrets.md`
- `docs/runbook/incident.md`
