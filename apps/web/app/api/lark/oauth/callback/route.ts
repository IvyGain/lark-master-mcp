import { NextResponse } from 'next/server';

/**
 * OAuth callback endpoint for the "Add to Lark" flow.
 *
 * Why it lives in apps/web instead of the Worker:
 *   The Applink + welcomeCard path can work end-to-end on Vercel alone,
 *   without requiring the Cloudflare Worker to be deployed yet. This route
 *   exchanges the Lark `code` for a user_access_token and redirects the
 *   browser to /connected. Once the Worker is live, the Lark console
 *   Redirect URI can be switched to the Worker's /lark/oauth/callback at
 *   any time — both endpoints behave identically.
 *
 * This handler is intentionally stateless: it does NOT persist the user
 * token (Vercel has no D1 binding). The real token store lives in the
 * Worker. If both are deployed, use the Worker URL as the Redirect URI so
 * tokens land in D1. This handler is the "Worker-less" fallback so the
 * landing page can be demoed the moment Vercel is up.
 */

const LARK_DOMAIN = process.env.NEXT_PUBLIC_LARK_DOMAIN ?? 'https://open.larksuite.com';
// Server-only secrets. These must be set in Vercel project settings.
const LARK_APP_ID = process.env.LARK_APP_ID ?? process.env.NEXT_PUBLIC_LARK_APP_ID ?? '';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET ?? '';

interface AppTokenResponse {
  code: number;
  msg?: string;
  app_access_token?: string;
}

interface UserTokenResponse {
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
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';

  if (!code) {
    return new NextResponse(
      renderErrorPage('認証コードが見つかりませんでした。もう一度お試しください。'),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    return new NextResponse(
      renderErrorPage(
        'サーバー設定エラー: LARK_APP_ID / LARK_APP_SECRET が未設定です。Vercel プロジェクトの Environment Variables を確認してください。',
      ),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  try {
    // 1) app_access_token (needed to exchange authorization code for user_access_token)
    const appTokenRes = await fetch(`${LARK_DOMAIN}/open-apis/auth/v3/app_access_token/internal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
    });
    const appTokenJson = (await appTokenRes.json()) as AppTokenResponse;
    if (appTokenJson.code !== 0 || !appTokenJson.app_access_token) {
      throw new Error(`app_access_token failed: ${appTokenJson.msg ?? 'unknown'}`);
    }

    // 2) tenant_access_token (needed to send bot messages)
    //    IMPORTANT: Use tenant_access_token, not app_access_token, to send messages as the Bot
    const tenantTokenRes = await fetch(`${LARK_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
    });
    const tenantTokenJson = (await tenantTokenRes.json()) as {
      code: number;
      tenant_access_token?: string;
      msg?: string;
    };
    if (tenantTokenJson.code !== 0 || !tenantTokenJson.tenant_access_token) {
      throw new Error(`tenant_access_token failed: ${tenantTokenJson.msg ?? 'unknown'}`);
    }

    // 3) user_access_token
    const userRes = await fetch(`${LARK_DOMAIN}/open-apis/authen/v1/access_token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${appTokenJson.app_access_token}`,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code }),
    });
    const userJson = (await userRes.json()) as UserTokenResponse;
    if (userJson.code !== 0 || !userJson.data) {
      throw new Error(`user_access_token failed: ${userJson.msg ?? 'unknown'}`);
    }

    // 3) Multi-tenant support: Store tenant information
    //    This enables the same app to work across different organizations
    const openId = userJson.data.open_id;
    const userName = userJson.data.name ?? '';
    const tenantKey = userJson.data.tenant_key ?? '';
    const unionId = userJson.data.union_id ?? '';

    // Log tenant information for multi-tenant tracking
    console.log('[oauth callback] User authenticated:', {
      openId,
      userName,
      tenantKey, // Organization identifier
      unionId,   // Cross-organization user identifier
      timestamp: new Date().toISOString(),
    });

    // TODO: Store user tokens in database with tenant_key for multi-tenant support
    // Example structure:
    // {
    //   tenant_key: tenantKey,
    //   open_id: openId,
    //   union_id: unionId,
    //   access_token: userJson.data.access_token,
    //   refresh_token: userJson.data.refresh_token,
    //   expires_at: Date.now() + userJson.data.expires_in * 1000,
    //   created_at: Date.now(),
    // }

    // 4) Send "Connected" message to user via Bot
    //    This notifies the user that OAuth succeeded and bot is ready to use
    //    IMPORTANT: Use tenant_access_token to send bot messages
    try {
      // Send a simple text message first to test token and connectivity
      await sendSimpleTextMessage(
        LARK_DOMAIN,
        tenantTokenJson.tenant_access_token,
        openId,
        `${userName ? `${userName} さん、` : ''}ようこそ Lark Master へ 🎉\n\n権限の承認ありがとうございます。このチャットで「help」と送信すると使い方が表示されます。`
      );
    } catch (cardErr) {
      // Non-fatal: even if card sending fails, OAuth succeeded
      console.warn('[oauth callback] failed to send message:', cardErr);
    }

    // 5) Redirect the browser to /connected with the name and state as
    //    query params (not the token — never send tokens via URL).
    const target = new URL('/connected', url.origin);
    if (userJson.data.name) target.searchParams.set('name', userJson.data.name);
    if (state) target.searchParams.set('state', state);
    return NextResponse.redirect(target, { status: 302 });
  } catch (err) {
    console.error('[oauth callback] failed', err);
    return new NextResponse(renderErrorPage((err as Error).message), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * Send a simple text message to user via Lark Bot
 * IMPORTANT: This uses tenant_access_token (not app_access_token) to send bot messages
 */
async function sendSimpleTextMessage(
  domain: string,
  tenantAccessToken: string,
  openId: string,
  text: string
): Promise<void> {
  const res = await fetch(`${domain}/open-apis/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${tenantAccessToken}`,
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Send text failed: ${res.status} ${errorText}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`Send text API error: ${json.msg ?? 'unknown'}`);
  }
}

/**
 * Send "Connected" card to user via Lark Bot
 * IMPORTANT: This uses tenant_access_token (not app_access_token) to send bot messages
 */
async function sendConnectedCard(
  domain: string,
  tenantAccessToken: string,
  openId: string,
  userName: string
): Promise<void> {
  const card = {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'green',
      title: {
        tag: 'plain_text',
        content: '✅ 接続が完了しました',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            `${userName ? `**${userName}** さん、` : ''}ようこそ Lark Master へ 🎉\n\n` +
            '以下のように話しかけてみてください:',
        },
      },
      {
        tag: 'div',
        fields: [
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**📅 カレンダー**\n> 「今日の予定を教えて」',
            },
          },
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**📄 ドキュメント**\n> 「議事録のドキュメントを作って」',
            },
          },
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**💬 メッセージ**\n> 「#general にデプロイ完了と送って」',
            },
          },
        ],
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '💡 このチャットで自然言語で指示するだけで、Larkのあらゆる操作が可能です。',
          },
        ],
      },
    ],
  };

  const res = await fetch(`${domain}/open-apis/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${tenantAccessToken}`,
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Send card failed: ${res.status} ${errorText}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`Send card API error: ${json.msg ?? 'unknown'}`);
  }
}

function renderErrorPage(message: string): string {
  const safe = message.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string),
  );
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Lark Master · エラー</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf9f5;color:#1a1a1a;max-width:560px;margin:12vh auto;padding:24px}
h1{color:#c0352b;font-size:28px;margin:0 0 12px}
pre{background:#fff;border:1px solid #e8e6dc;border-radius:8px;padding:12px;white-space:pre-wrap;color:#3d3d3d}
a{color:#d97757}
</style>
</head>
<body>
<h1>認証に失敗しました</h1>
<pre>${safe}</pre>
<p><a href="/">トップに戻る</a></p>
</body>
</html>`;
}
