/**
 * Minimal Lark Open API client for the Cloudflare Worker.
 *
 * Why not use `@larksuiteoapi/node-sdk`?
 *   The Worker runs in workerd, which does not provide Node's `child_process`
 *   / `fs` / `net` primitives. The official SDK pulls those in. We only need
 *   two endpoints from the Worker anyway:
 *     1. Acquire tenant_access_token (so we can post as the bot)
 *     2. Send an IM message (text or interactive card)
 *   so we just use `fetch()` directly.
 *
 * Token caching uses the Worker's KV namespace bound as `CACHE` to avoid
 * hitting the auth endpoint on every event.
 */

import type { Env } from '../env.ts';

const TENANT_TOKEN_KV_KEY = 'lark:tenant_access_token';

interface TenantTokenResponse {
  code: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
}

interface CachedTenantToken {
  token: string;
  expires_at: number; // epoch seconds
}

/**
 * Get a valid tenant_access_token, caching it in KV for its lifetime minus a
 * 60 second safety margin.
 */
export async function getTenantAccessToken(env: Env): Promise<string> {
  const cached = await env.CACHE.get<CachedTenantToken>(TENANT_TOKEN_KV_KEY, 'json');
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires_at - 60 > now) {
    return cached.token;
  }

  const domain = env.LARK_DOMAIN || 'https://open.larksuite.com';
  const resp = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      app_id: env.LARK_APP_ID,
      app_secret: env.LARK_APP_SECRET,
    }),
  });

  const data = (await resp.json()) as TenantTokenResponse;
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`tenant_access_token failed: code=${data.code} msg=${data.msg}`);
  }

  const ttl = Number(data.expire ?? 7200);
  const next: CachedTenantToken = {
    token: data.tenant_access_token,
    expires_at: now + ttl,
  };
  await env.CACHE.put(TENANT_TOKEN_KV_KEY, JSON.stringify(next), {
    expirationTtl: Math.max(ttl - 30, 60),
  });
  return next.token;
}

export type ReceiveIdType = 'open_id' | 'user_id' | 'union_id' | 'email' | 'chat_id';

export interface SendMessageInput {
  receive_id_type: ReceiveIdType;
  receive_id: string;
  msg_type: 'text' | 'interactive' | 'post';
  /** already-stringified JSON for the content field */
  content: string;
}

export interface SendMessageResult {
  ok: boolean;
  code: number;
  msg?: string;
  message_id?: string;
}

/**
 * POST /open-apis/im/v1/messages — send a message as the bot.
 */
export async function sendMessage(
  env: Env,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const token = await getTenantAccessToken(env);
  const domain = env.LARK_DOMAIN || 'https://open.larksuite.com';
  const url = new URL(`${domain}/open-apis/im/v1/messages`);
  url.searchParams.set('receive_id_type', input.receive_id_type);

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receive_id: input.receive_id,
      msg_type: input.msg_type,
      content: input.content,
    }),
  });

  const data = (await resp.json()) as {
    code: number;
    msg?: string;
    data?: { message_id?: string };
  };
  return {
    ok: data.code === 0,
    code: data.code,
    msg: data.msg,
    message_id: data.data?.message_id,
  };
}

/**
 * Helper: send a plain text message.
 */
export function sendText(
  env: Env,
  receive_id: string,
  text: string,
  receive_id_type: ReceiveIdType = 'open_id',
): Promise<SendMessageResult> {
  return sendMessage(env, {
    receive_id_type,
    receive_id,
    msg_type: 'text',
    content: JSON.stringify({ text }),
  });
}

/**
 * Helper: send an interactive card (Lark card v2 JSON).
 */
export function sendCard(
  env: Env,
  receive_id: string,
  card: Record<string, unknown>,
  receive_id_type: ReceiveIdType = 'open_id',
): Promise<SendMessageResult> {
  return sendMessage(env, {
    receive_id_type,
    receive_id,
    msg_type: 'interactive',
    content: JSON.stringify(card),
  });
}
