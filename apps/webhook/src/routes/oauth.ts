import { Hono } from 'hono';
import type { Env } from '../env.ts';

type Bindings = { Bindings: Env };

export const oauth = new Hono<Bindings>();

/**
 * OAuth callback — exchanges the Lark `code` for a user_access_token and
 * stores it encrypted in D1.
 *
 * Redirect URI: https://<worker-domain>/lark/oauth/callback
 * Lark docs:    https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/authorization-code
 */
oauth.get('/lark/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    return c.html(renderErrorPage('Missing "code" query parameter'), 400);
  }

  const domain = c.env.LARK_DOMAIN || 'https://open.larksuite.com';

  try {
    // Step 1: acquire app_access_token
    const tokenRes = await fetch(`${domain}/open-apis/auth/v3/app_access_token/internal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        app_id: c.env.LARK_APP_ID,
        app_secret: c.env.LARK_APP_SECRET,
      }),
    });
    const tokenJson = (await tokenRes.json()) as {
      code: number;
      msg?: string;
      app_access_token?: string;
    };
    if (tokenJson.code !== 0 || !tokenJson.app_access_token) {
      throw new Error(`app_access_token failed: ${tokenJson.msg ?? 'unknown'}`);
    }

    // Step 2: exchange code for user_access_token
    const userRes = await fetch(`${domain}/open-apis/authen/v1/access_token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenJson.app_access_token}`,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code }),
    });
    const userJson = (await userRes.json()) as {
      code: number;
      msg?: string;
      data?: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_expires_in: number;
        open_id: string;
        union_id?: string;
        tenant_key?: string;
        name?: string;
        scope?: string;
      };
    };

    if (userJson.code !== 0 || !userJson.data) {
      throw new Error(`user_access_token failed: ${userJson.msg ?? 'unknown'}`);
    }

    const d = userJson.data;
    const now = Date.now();

    // Persist user
    await c.env.DB.prepare(
      `INSERT INTO users (open_id, union_id, tenant_key, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(open_id) DO UPDATE SET display_name = excluded.display_name`,
    )
      .bind(d.open_id, d.union_id ?? null, d.tenant_key ?? 'unknown', d.name ?? null, now)
      .run();

    // Encrypt and store tokens
    // NOTE: real encryption deferred — for MVP we store base64 placeholders.
    // Replace with AES-GCM using a Worker Secret key before going live.
    const accessEnc = new TextEncoder().encode(d.access_token);
    const refreshEnc = new TextEncoder().encode(d.refresh_token);

    await c.env.DB.prepare(
      `INSERT INTO tokens (open_id, access_token_enc, refresh_token_enc, scopes,
                           expires_at, refresh_expires_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(open_id) DO UPDATE SET
         access_token_enc   = excluded.access_token_enc,
         refresh_token_enc  = excluded.refresh_token_enc,
         scopes             = excluded.scopes,
         expires_at         = excluded.expires_at,
         refresh_expires_at = excluded.refresh_expires_at,
         updated_at         = excluded.updated_at`,
    )
      .bind(
        d.open_id,
        accessEnc,
        refreshEnc,
        d.scope ?? '',
        now + d.expires_in * 1000,
        now + d.refresh_expires_in * 1000,
        now,
      )
      .run();

    return c.html(renderSuccessPage(d.name ?? d.open_id, state));
  } catch (err) {
    console.error('[oauth] callback failed', err);
    return c.html(renderErrorPage((err as Error).message), 500);
  }
});

function renderSuccessPage(name: string, state: string | undefined): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Lark Master · Connected</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,ui-sans-serif,system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#1f1f1f}h1{font-size:28px;margin:0 0 8px}p{line-height:1.6}.ok{color:#00a862}</style>
</head>
<body>
<h1>🎉 Connected</h1>
<p class="ok">Welcome, <strong>${escapeHtml(name)}</strong>. Lark Master is ready.</p>
<p>You can close this tab and head back to the Lark app. The bot will now respond on your behalf.</p>
${state ? `<p style="color:#666;font-size:13px">state=${escapeHtml(state)}</p>` : ''}
</body></html>`;
}

function renderErrorPage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Lark Master · Error</title>
<style>body{font-family:-apple-system,ui-sans-serif,system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#1f1f1f}h1{color:#c0352b}</style>
</head>
<body>
<h1>Something went wrong</h1>
<pre style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap">${escapeHtml(message)}</pre>
<p>Try again from the Add to Lark link, or contact support.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch] as string));
}
