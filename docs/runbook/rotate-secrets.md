# Runbook: Rotate Secrets

How to rotate the five secrets that can meaningfully be rotated without a
full reinstall. Each procedure is designed to avoid downtime.

See `docs/architecture/security.md` for the trust boundaries.

## Inventory

| Secret | Owned by | Stored in |
|--------|----------|-----------|
| `LARK_APP_SECRET` | Lark Dev Console | Worker (`wrangler secret`) |
| `LARK_VERIFICATION_TOKEN` | Lark Dev Console | Worker (`wrangler secret`) |
| `LARK_ENCRYPT_KEY` | Lark Dev Console | Worker (`wrangler secret`) |
| `BRAIN_SHARED_SECRET` | You | Worker + Brain container env |
| `ANTHROPIC_API_KEY` | Anthropic Console | Brain container env (+ Worker for pass-through) |

General rule: never delete the old secret before the new one is live on both
sides. For the Lark secrets you *must* flip Lark Dev Console and Worker
within the same short window because there is no dual-accept mode.

---

## 1. Rotate `LARK_APP_SECRET`

Impact: lark-cli and server-to-server API calls will need to re-auth.

1. In the Lark Dev Console, generate a new App Secret. Copy it.
2. On the Worker:
   ```bash
   cd apps/webhook
   wrangler secret put LARK_APP_SECRET     # paste new value
   wrangler deploy
   ```
3. If the brain image was built with a baked-in lark-cli token (it should
   not be — prefer runtime `lark-cli config init`), rebuild the image so the
   new App Secret is used.
4. Re-run `lark-cli auth status` on any machine that uses the CLI and, if
   needed, `lark-cli config init` to refresh.
5. Revoke the old App Secret in the Lark Dev Console.

### Verification

- [ ] `wrangler tail` shows no 401 from Lark Open API after rotation.
- [ ] `lark-cli auth status` reports the expected App ID without errors.
- [ ] A test message to the bot still produces a reply.

---

## 2. Rotate `LARK_VERIFICATION_TOKEN`

Impact: during the swap window, incoming Lark events will fail signature
verification. Keep the window under 30 seconds.

1. Generate the new token in the Lark Dev Console but do not save yet.
2. On the Worker:
   ```bash
   wrangler secret put LARK_VERIFICATION_TOKEN
   wrangler deploy
   ```
3. Immediately save the new token in the Lark Dev Console, then click
   "Verify" on the Event Subscription URL.
4. Watch `wrangler tail` for a minute; you should not see signature
   rejections in `audit`.

### Verification

- [ ] Lark Dev Console "Verify" on the Event URL returns OK after rotation.
- [ ] `wrangler tail` shows `/lark/event` 200s for a new test message.
- [ ] No new rows in `audit` with `kind='signature_failed'`.

---

## 3. Rotate `LARK_ENCRYPT_KEY`

Impact: same as verification token — a short window where Lark encrypts with
the new key while Worker still decrypts with the old one.

1. Generate the new Encrypt Key in the Lark Dev Console.
2. ```bash
   wrangler secret put LARK_ENCRYPT_KEY
   wrangler deploy
   ```
3. Save the new key in the Lark Dev Console.

### Verification

- [ ] Test message from Lark still produces a reply card.
- [ ] `wrangler tail` shows no `decrypt_failed` entries.

---

## 4. Rotate `BRAIN_SHARED_SECRET` (zero-downtime)

Impact: none if you use dual-accept.

The brain should be patched to accept either `BRAIN_SHARED_SECRET` or
`BRAIN_SHARED_SECRET_NEXT` while you rotate. Until that patch lands, follow
the fast variant below.

### Dual-accept variant

1. Generate new secret: `NEW=$(openssl rand -base64 48)`.
2. Set `BRAIN_SHARED_SECRET_NEXT=$NEW` on the brain container:
   ```bash
   fly secrets set BRAIN_SHARED_SECRET_NEXT="$NEW" -a lark-brain
   ```
   Container restarts; both old and new are now accepted.
3. Flip the Worker:
   ```bash
   cd apps/webhook
   wrangler secret put BRAIN_SHARED_SECRET     # paste NEW
   wrangler deploy
   ```
4. On the brain: promote `NEXT` to primary and remove the old value.
   ```bash
   fly secrets set BRAIN_SHARED_SECRET="$NEW" -a lark-brain
   fly secrets unset BRAIN_SHARED_SECRET_NEXT -a lark-brain
   ```

### Fast variant (brief window)

If dual-accept is not yet implemented:

1. `fly secrets set BRAIN_SHARED_SECRET="$NEW"` on the brain.
2. Immediately `wrangler secret put BRAIN_SHARED_SECRET` and
   `wrangler deploy` on the Worker.
3. Any Lark events in between will fail with 401 from the brain and Lark
   will retry.

### Verification

- [ ] `curl -H "Authorization: Bearer $NEW" $BRAIN_URL/healthz` returns 200.
- [ ] `curl -H "Authorization: Bearer $OLD" $BRAIN_URL/healthz` returns 401.
- [ ] A test message to the bot still produces a reply.

---

## 5. Rotate `ANTHROPIC_API_KEY`

Impact: none. Anthropic keys can be rotated freely.

1. Create a new key in the Anthropic Console.
2. ```bash
   fly secrets set ANTHROPIC_API_KEY="sk-ant-..." -a lark-brain
   ```
3. Also update the Worker copy (if it's forwarded):
   ```bash
   cd apps/webhook
   wrangler secret put ANTHROPIC_API_KEY
   wrangler deploy
   ```
4. Revoke the old key in the Anthropic Console after a few minutes.

### Verification

- [ ] A test message to the bot still produces a reply.
- [ ] Anthropic Console shows usage on the new key within 5 minutes.
- [ ] `fly logs -a lark-brain` shows no 401 from `api.anthropic.com`.

---

## Related documents

- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
- `docs/runbook/incident.md`
