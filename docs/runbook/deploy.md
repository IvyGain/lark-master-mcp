# Runbook: First-time Deploy

End-to-end deploy checklist for the cloud path (`apps/webhook`, `apps/brain`,
`apps/web`). The local MCP server (`apps/mcp-server`) is published separately
to npm and is not part of this runbook.

Target architecture: `docs/architecture/overview.md`.

Estimated time: ~60 minutes the first time, ~10 minutes on subsequent deploys.

## Prerequisites

- Cloudflare account with Workers + D1 + Durable Objects enabled.
- Fly.io account (interim container host until Cloudflare Containers GA) or
  any Docker-capable host with a public URL.
- Vercel account for `apps/web`.
- Anthropic API key.
- A Lark tenant you can register a Custom App against.
- Local tools: `wrangler`, `fly` (or `flyctl`), `vercel`, `pnpm`.

---

## a) Register the Lark Custom App

Follow `docs/lark-knowledge/dev-console-manual.md`. Capture the following
values — you'll need them in step (d):

- `App ID`
- `App Secret`
- `Verification Token`
- `Encrypt Key` (optional, but recommended)

Add scopes: `im:message`, `im:message.group_at_msg`,
`im:message.p2p_msg`, `im:chat`, `contact:user.base:readonly`, plus any scopes
used by the 41 tools in `apps/mcp-server` (calendar, base, docs, drive,
sheets, task, mail, wiki, approval). Enable Event Subscription but leave the
URL blank for now; you'll fill it in step (i).

## b) Create the D1 database

```bash
cd apps/webhook
wrangler login
wrangler d1 create lark-master
```

Copy the returned `database_id` into `apps/webhook/wrangler.jsonc` under the
`d1_databases` binding for `DB`. Then apply migrations:

```bash
wrangler d1 migrations apply lark-master --remote
```

This runs `apps/webhook/migrations/0001_init.sql` and creates `users`,
`tokens`, `conversations`, `messages`, `audit`.

## c) Create the KV namespace

```bash
wrangler kv namespace create CACHE
```

Copy the returned `id` into `apps/webhook/wrangler.jsonc` under the
`kv_namespaces` binding for `CACHE`.

## d) Set Worker secrets

All 7 secrets go in via `wrangler secret put` (never into `wrangler.jsonc`):

```bash
wrangler secret put LARK_VERIFICATION_TOKEN
wrangler secret put LARK_ENCRYPT_KEY           # skip if not using encryption
wrangler secret put LARK_APP_ID
wrangler secret put LARK_APP_SECRET
wrangler secret put LARK_DOMAIN                # e.g. https://open.feishu.cn or https://open.larksuite.com
wrangler secret put ANTHROPIC_API_KEY          # forwarded to the brain
wrangler secret put BRAIN_SHARED_SECRET        # random 32+ bytes
# BRAIN_URL is set later in step (g)
```

Generate `BRAIN_SHARED_SECRET` with e.g. `openssl rand -base64 48`.

## e) Deploy the Worker

```bash
cd apps/webhook
wrangler deploy
```

Note the `*.workers.dev` URL. You'll need it for (i).

## f) Build and deploy the brain container

Cloudflare Containers is not yet GA at time of writing; use Fly.io as an
interim host. The brain is a standard Node container whose Dockerfile
installs `@larksuite/cli` globally.

```bash
cd apps/brain
fly launch                  # creates fly.toml, do NOT deploy yet
fly secrets set \
  ANTHROPIC_API_KEY='sk-ant-...' \
  BRAIN_SHARED_SECRET='same-value-as-worker' \
  LARK_DEFAULT_DOMAIN='https://open.feishu.cn' \
  LARK_CLI_BIN='lark-cli' \
  PORT='8080'
fly deploy
```

After deploy, capture the public URL (e.g.
`https://lark-brain.fly.dev`) — that's your `BRAIN_URL`.

When Cloudflare Containers GA arrives, replace the Fly.io steps with the
equivalent `wrangler containers deploy` and keep the same env vars.

## g) Wire Worker → Brain

```bash
cd apps/webhook
wrangler secret put BRAIN_URL     # paste https://lark-brain.fly.dev
wrangler deploy                   # redeploy to pick up the new secret reference
```

## h) Deploy the web app

```bash
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_LARK_APP_ID
vercel env add NEXT_PUBLIC_LARK_DOMAIN
vercel env add NEXT_PUBLIC_LARK_REDIRECT_URI   # e.g. https://<worker>.workers.dev/lark/oauth/callback
vercel deploy --prod
```

## i) Point Lark at the Worker

In the Lark Developer Console for the Custom App created in (a):

1. **Event Subscription** → Request URL: paste the Worker URL +
   `/lark/event`. Click "Verify". Paste the Verification Token and Encrypt
   Key that match (d).
2. **Permissions** → ensure all required scopes are applied and the app is
   released (or added to your test tenant).
3. **Bot features** → enable the bot, add your test user as a tester.
4. **Redirect URLs** (if using OAuth) → add the Worker's
   `/lark/oauth/callback` URL.

## j) Smoke test

```bash
# Worker health
curl https://<worker>.workers.dev/healthz

# Brain health (through the public Fly URL, Bearer header required)
curl -H "Authorization: Bearer $BRAIN_SHARED_SECRET" https://lark-brain.fly.dev/healthz

# Real end-to-end
# Send a direct message to your bot in Lark. Expect a reply within ~10s.
```

Inspect logs if something is off:

```bash
wrangler tail --format=pretty       # Worker + DO logs
fly logs -a lark-brain              # Brain container logs
lark-cli auth status                # Verify lark-cli is still bot-authed
```

---

## Verification

- [ ] `wrangler d1 execute lark-master --remote --command "SELECT name FROM sqlite_master WHERE type='table'"` lists `users`, `tokens`, `conversations`, `messages`, `audit`.
- [ ] `wrangler secret list` shows all 8 Worker secrets (7 from (d) plus `BRAIN_URL`).
- [ ] `curl https://<worker>.workers.dev/healthz` returns `200`.
- [ ] `curl -H "Authorization: Bearer $BRAIN_SHARED_SECRET" $BRAIN_URL/healthz` returns `200`.
- [ ] Lark Developer Console "Verify" on the Event Subscription URL succeeds.
- [ ] Sending "ping" to the bot produces an assistant reply card within 15s.
- [ ] A new row exists in `messages` for both `role='user'` and `role='assistant'` for the ping turn.
- [ ] `apps/web` landing page at the Vercel URL renders the "Add to Lark" button and `/connected` page loads.
