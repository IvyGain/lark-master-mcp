# Deployment Guide

Quick deployment guide for lark-master-mcp components.

## Overview

| Component | Platform | Config File | Deployment |
|-----------|----------|-------------|------------|
| MCP Server | npm | `apps/mcp-server/package.json` | `npm publish` |
| Web App | Vercel | `apps/web/vercel.json` | Auto-deploy on push to `main` |
| Webhook | Cloudflare Workers | `apps/webhook/wrangler.toml` | `wrangler deploy` |
| Brain | Container (Fly.io/Cloud Run) | `apps/brain/Dockerfile` | `flyctl deploy` or `gcloud run deploy` |

For detailed instructions, see [`docs/runbook/deploy.md`](docs/runbook/deploy.md) (Japanese).

---

## Quick Start

### 1. MCP Server (npm)

```bash
cd apps/mcp-server
npm test && npm run build
npm version patch
npm publish --access public
```

Published as: `@ivygain/lark-master-mcp`

### 2. Web App (Vercel)

**Auto-deploy**: Push to `main` branch

**Manual deploy**:
```bash
cd apps/web
vercel --prod
```

**Environment variables**:
- `NEXT_PUBLIC_LARK_APP_ID` - Your Lark App ID
- `NEXT_PUBLIC_WEB_URL` - Your web app URL

### 3. Webhook (Cloudflare Workers)

```bash
cd apps/webhook

# One-time setup
wrangler d1 create lark-master
# Update database_id in wrangler.toml

# Set secrets
wrangler secret put LARK_APP_ID
wrangler secret put LARK_APP_SECRET
wrangler secret put LARK_VERIFICATION_TOKEN
wrangler secret put LARK_ENCRYPT_KEY
wrangler secret put BRAIN_URL

# Deploy
wrangler deploy
```

### 4. Brain (Container)

**Fly.io**:
```bash
cd apps/brain
flyctl launch
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set LARK_CLI_BIN=lark-cli
flyctl deploy
```

**Cloud Run**:
```bash
cd apps/brain
gcloud builds submit --tag gcr.io/PROJECT_ID/lark-master-brain
gcloud run deploy lark-master-brain \
  --image gcr.io/PROJECT_ID/lark-master-brain \
  --platform managed \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-...,LARK_CLI_BIN=lark-cli
```

---

## Environment Variables

### MCP Server
- `LARK_CLI_BIN` - Path to lark-cli (default: `lark-cli`)
- `LARK_MASTER_PROFILE_DIR` - Profile directory (default: `~/.lark-master`)
- `LARK_DEFAULT_IDENTITY` - Default identity (default: `auto`)

### Web App (Vercel)
- `NEXT_PUBLIC_LARK_APP_ID` - Lark App ID
- `NEXT_PUBLIC_WEB_URL` - Web app URL

### Webhook (Cloudflare Workers Secrets)
- `LARK_APP_ID` - Lark App ID
- `LARK_APP_SECRET` - Lark App Secret
- `LARK_VERIFICATION_TOKEN` - Event verification token
- `LARK_ENCRYPT_KEY` - Event encryption key (optional)
- `BRAIN_URL` - Brain container URL

### Brain (Container)
- `ANTHROPIC_API_KEY` - Claude API key
- `LARK_CLI_BIN` - Path to lark-cli (default: `lark-cli`)
- `PORT` - Server port (default: `8080`)

---

## Health Checks

```bash
# Web
curl https://your-web-url.vercel.app/

# Webhook
curl https://lark-master-webhook.workers.dev/healthz

# Brain
curl https://lark-master-brain.fly.dev/healthz
```

---

## Deployment Order

1. **Brain** (container) - Deploy first
2. **Webhook** (workers) - Needs Brain URL
3. **Web** (Vercel) - Independent
4. **MCP Server** (npm) - Independent

---

## Troubleshooting

### MCP Server
- **Issue**: `npx` hangs
- **Solution**: `npm cache clean --force`

### Web App
- **Issue**: OAuth fails
- **Solution**: Check `NEXT_PUBLIC_LARK_APP_ID` and redirect URI in Lark console

### Webhook
- **Issue**: Events not received
- **Solution**: Verify `LARK_VERIFICATION_TOKEN` in Lark console matches

### Brain
- **Issue**: Container crashes
- **Solution**: Check logs with `flyctl logs` or `gcloud run services logs read`

---

For complete deployment instructions with detailed steps, see:
- [`docs/runbook/deploy.md`](docs/runbook/deploy.md) - Complete deployment runbook (Japanese)
- [`README.md`](README.md) - Project overview and architecture
