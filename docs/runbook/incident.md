# Runbook: Incident Response

Cheat sheet for the most common failures in the cloud path. For secret
rotation see `docs/runbook/rotate-secrets.md`. For first-time deploy see
`docs/runbook/deploy.md`.

## 0. Situational awareness (run these first)

```bash
# Worker + DO logs, pretty
wrangler tail --format=pretty

# Brain container logs
fly logs -a lark-brain

# lark-cli auth
lark-cli auth status

# D1 quick sanity
wrangler d1 execute lark-master --remote \
  --command "SELECT COUNT(*) AS n FROM messages WHERE created_at > datetime('now','-10 minutes')"
```

---

## Incident A: "The bot doesn't reply"

Work the layers top-down. Stop at the first layer that is red.

### A.1 Lark → Worker

- `wrangler tail` while you send a test message.
- Expected: `POST /lark/event 200` within ~1s.
- Red flags: no log line at all (Lark isn't reaching the Worker), or 401 (signature).

If no line: check the Lark Developer Console → Event Subscription URL. Click "Verify". If that fails, the Worker URL or the Verification Token is wrong.

If 401: rotate the verification token following `docs/runbook/rotate-secrets.md` §2. Look in `audit` for `signature_failed` rows.

### A.2 Worker → DO

- `wrangler tail` should show a `ConversationDO` log line acknowledging the session_id.
- If absent, the routing code in `/lark/event` didn't pick up the event type. Check the event payload shape.

### A.3 DO → Brain

- `wrangler tail` should show `POST $BRAIN_URL/invoke`.
- Red flags: timeout, 401, 5xx.

```bash
# From your laptop
curl -i -H "Authorization: Bearer $BRAIN_SHARED_SECRET" $BRAIN_URL/healthz
```

- 401: `BRAIN_SHARED_SECRET` drift between Worker and brain. Re-apply (`docs/runbook/rotate-secrets.md` §4).
- Connection refused: the container is down. `fly status -a lark-brain` then `fly deploy` or `fly machine restart`.

### A.4 Brain → lark-cli

- `fly logs -a lark-brain` — look for stderr from the Claude Agent SDK.
- Common error: `lark-cli: command not found`. This means the image build lost the global install. Rebuild and redeploy the brain.

### A.5 lark-cli → Lark Open API

- If `lark-cli auth status` shows expired or missing credentials, re-run:

  ```bash
  lark-cli config init
  lark-cli auth status
  ```

- If the app secret was rotated recently, you must `lark-cli config init` again.

---

## Incident B: "Token expired / 401 from Lark Open API"

Typically caused by `LARK_APP_SECRET` rotation or a stale cached app access token in KV.

```bash
# Force-clear the cached app access token
wrangler kv key delete --binding=CACHE "lark:app_access_token"

# Re-init lark-cli
lark-cli config init
lark-cli auth status
```

If the rotation was recent, double-check that the Worker secret was
re-`put` and that the Worker was redeployed (secret changes are not picked
up until the next deploy).

### Verification

- [ ] `lark-cli im list-messages ...` against a real chat succeeds.
- [ ] New test message to the bot produces a reply.

---

## Incident C: "Rate limit hit / conversation is stuck"

Symptoms: the bot replies to some threads but the stuck thread keeps
timing out or never returns.

The DO is a single-writer for one `session_id`. If a turn is wedged (brain
crashed mid-turn, DO `in_flight=true` never cleared), new events for that
thread queue behind it.

```bash
# Inspect the DO's storage
wrangler tail --format=pretty
# Look for "in_flight=true" log lines on the affected session_id.
```

Mitigations:

1. **Force-reset the stuck DO**: redeploy the Worker — DOs recycle on
   deploy, clearing in-memory state. In-flight storage keys that don't
   self-clean should be fixed in code, not operationally.
2. **Adjust per-thread policy**: if you need tighter serialization or a
   timeout-and-kill, update `ConversationDO` to expire `in_flight` after N
   seconds and issue an apologetic `send_reply_text`.
3. **Per-tenant throttle**: if abuse, add a KV-backed token bucket keyed by
   `tenant_key`. See the "TODO: per-tenant rate limiting" item in
   `docs/architecture/security.md`.

### Verification

- [ ] The stuck thread accepts a new message after mitigation.
- [ ] `audit` shows no `do_stuck` rows for the last 10 minutes.

---

## Incident D: "OAuth callback returns 500"

Symptoms: the `/connected` page in `apps/web` never renders, or the Worker
returns 500 on `/lark/oauth/callback`.

Most common cause: redirect URI mismatch between Lark Dev Console, Worker
secret, and `apps/web` env (`NEXT_PUBLIC_LARK_REDIRECT_URI`).

1. Check the three values match *character for character*:
   - Lark Dev Console → Redirect URLs
   - `vercel env ls` on the `apps/web` project → `NEXT_PUBLIC_LARK_REDIRECT_URI`
   - Worker code path `/lark/oauth/callback` URL (scheme, host, path)
2. Check `wrangler tail` on the failing callback. Look for:
   - `bad_redirect_uri` — mismatch above.
   - `state_mismatch` — the `state` nonce isn't in KV (likely user took too long; retry).
   - `exchange_failed` — Lark returned a non-200. Verify `LARK_APP_ID` and `LARK_APP_SECRET` are current.
3. Check `audit` for the most recent `oauth_callback_failed` row, which
   will carry the reason.

### Verification

- [ ] Clicking "Add to Lark" on the Vercel landing completes and lands on `/connected`.
- [ ] A new row exists in `users` and `tokens` for the test user.
- [ ] `wrangler tail` shows `/lark/oauth/callback 302` for the success case.

---

## Related documents

- `docs/architecture/overview.md`
- `docs/architecture/sequence-phone-to-cloud.md`
- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
- `docs/runbook/rotate-secrets.md`
