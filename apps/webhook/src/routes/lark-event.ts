import { Hono } from 'hono';
import type { Env } from '../env.ts';
import { extractChallenge, verifyLarkEvent } from '../lark/verify.ts';
import { sendCard, sendText } from '../lark/api.ts';
import { examplesCard, helpCard, welcomeCard } from '../cards/welcome.ts';
import { setupGuideCard, quickSetupCard } from '../cards/setup-guide.ts';

type Bindings = { Bindings: Env };

export const larkEvent = new Hono<Bindings>();

larkEvent.post('/lark/event', async (c) => {
  const rawBody = await c.req.text();
  const v = await verifyLarkEvent({
    rawBody,
    headers: c.req.raw.headers,
    verificationToken: c.env.LARK_VERIFICATION_TOKEN,
    encryptKey: c.env.LARK_ENCRYPT_KEY,
  });

  if (!v.ok) {
    console.warn('[lark/event] verification failed:', v.reason);
    return c.json({ ok: false, reason: v.reason }, 401);
  }

  // Handshake
  const challenge = extractChallenge(v.decryptedBody);
  if (challenge) {
    return c.json({ challenge });
  }

  const payload = v.decryptedBody as Record<string, unknown>;
  const header = (payload.header as Record<string, unknown>) ?? {};
  const eventType = (header.event_type as string) ?? 'unknown';
  const event = (payload.event as Record<string, unknown>) ?? {};

  // ---------- Path A: bot added / p2p chat created ----------
  if (
    eventType === 'p2p_chat_create_v1' ||
    eventType === 'im.chat.member.bot.added_v1'
  ) {
    const target = extractOpenIdFromBotAddEvent(event);
    if (target) {
      const env = c.env;
      const { receiveId, receiveIdType } = target;
      const appId = env.LARK_APP_ID || 'your_app_id';

      // Send setup guide card to admin when bot is first added
      c.executionCtx.waitUntil(
        sendCard(env, receiveId, setupGuideCard(appId), receiveIdType).catch(
          (err) => {
            console.error('[lark/event] setup guide sendCard failed', err);
          },
        ),
      );
    } else {
      console.warn('[lark/event] bot-add event missing both open_id and chat_id');
    }
    return c.json({ ok: true, setupGuided: true });
  }

  // ---------- Path B: incoming user message ----------
  if (eventType === 'im.message.receive_v1') {
    console.log('[lark/event] Received message event:', JSON.stringify(event, null, 2));
    const extracted = extractMessageContext(eventType, event);
    console.log('[lark/event] Extracted context:', extracted);
    if (!extracted) {
      console.log('[lark/event] Skipping non-text message');
      return c.json({ ok: true, skipped: 'non_text_message' });
    }

    const env = c.env;
    const replyTo = extracted.openId ?? extracted.chatId;
    const replyIdType: 'open_id' | 'chat_id' = extracted.openId ? 'open_id' : 'chat_id';
    const normalized = extracted.prompt.trim().toLowerCase();
    console.log('[lark/event] Processing command:', normalized, 'replyTo:', replyTo, 'type:', replyIdType);

    // Fast-path text commands — reply directly, do NOT enqueue the DO.
    if (replyTo) {
      if (
        normalized === 'ping' ||
        normalized === 'pong' ||
        normalized === 'hello' ||
        normalized === 'hi'
      ) {
        c.executionCtx.waitUntil(
          sendText(env, replyTo, 'pong 👋 — lark-master is online', replyIdType).catch(
            (err) => console.error('[lark/event] ping reply failed', err),
          ),
        );
        return c.json({ ok: true, fastPath: 'ping' });
      }

      if (
        normalized === 'help' ||
        normalized === '/help' ||
        normalized === '使い方' ||
        normalized === 'ヘルプ'
      ) {
        console.log('[lark/event] ✅ Help command detected! Sending help text...');
        const helpText =
          '📖 Lark Master の使い方\n\n' +
          '自然言語でそのまま指示してください。Claude が意図を理解し、必要な Lark API を自動で呼び出します。\n\n' +
          '**できること:**\n' +
          '📅 Calendar - 予定 / 空き時間 / 招待\n' +
          '💬 Messenger - チャット / カード / Bot 招待\n' +
          '📄 Docs - 作成 / 取得 / 編集\n' +
          '📊 Base - テーブル / レコード / ビュー\n' +
          '🗂 Drive / Wiki - ファイル / Wiki ノード\n' +
          '✅ Task - 作成 / 割当 / 完了\n\n' +
          '**コマンド:**\n' +
          '• help または /help — この使い方を表示\n' +
          '• setup または /setup — 管理者向けセットアップガイド\n' +
          '• ping — 接続確認\n' +
          '• /try — サンプル例文を表示';

        c.executionCtx.waitUntil(
          sendText(env, replyTo, helpText, replyIdType)
            .then((result) => {
              console.log('[lark/event] ✅ Help text sent successfully:', result);
            })
            .catch((err) => {
              console.error('[lark/event] ❌ Help reply failed:', err);
            }),
        );
        return c.json({ ok: true, fastPath: 'help' });
      }

      if (
        normalized === '/try' ||
        normalized === '/example' ||
        normalized === '/examples' ||
        normalized === '試して'
      ) {
        c.executionCtx.waitUntil(
          sendCard(env, replyTo, examplesCard(), replyIdType).catch((err) =>
            console.error('[lark/event] examples reply failed', err),
          ),
        );
        return c.json({ ok: true, fastPath: 'examples' });
      }

      if (
        normalized === 'setup' ||
        normalized === '/setup' ||
        normalized === 'セットアップ' ||
        normalized === '設定'
      ) {
        const appId = env.LARK_APP_ID || 'your_app_id';
        c.executionCtx.waitUntil(
          sendCard(env, replyTo, setupGuideCard(appId), replyIdType).catch((err) =>
            console.error('[lark/event] setup guide reply failed', err),
          ),
        );
        return c.json({ ok: true, fastPath: 'setup' });
      }

      if (
        normalized === '/quicksetup' ||
        normalized === 'quicksetup' ||
        normalized === 'クイックセットアップ'
      ) {
        const appId = env.LARK_APP_ID || 'your_app_id';
        c.executionCtx.waitUntil(
          sendCard(env, replyTo, quickSetupCard(appId), replyIdType).catch((err) =>
            console.error('[lark/event] quick setup reply failed', err),
          ),
        );
        return c.json({ ok: true, fastPath: 'quicksetup' });
      }
    }

    // Fall through to Durable Object brain enqueue.
    const doId = env.CONVERSATION.idFromName(extracted.threadId);
    const stub = env.CONVERSATION.get(doId);
    c.executionCtx.waitUntil(
      stub
        .fetch('https://do/enqueue', {
          method: 'POST',
          body: JSON.stringify({
            threadId: extracted.threadId,
            openId: extracted.openId,
            chatId: extracted.chatId,
            prompt: extracted.prompt,
            eventType,
            originalPayload: payload,
          }),
        })
        .catch((err) => {
          console.error('[lark/event] DO enqueue failed', err);
        }),
    );
    return c.json({ ok: true });
  }

  // ---------- Path C: anything else ----------
  return c.json({ ok: true, skipped: eventType });
});

interface ExtractedContext {
  threadId: string;
  prompt: string;
  openId?: string;
  chatId?: string;
}

function extractMessageContext(
  eventType: string,
  event: Record<string, unknown>,
): ExtractedContext | null {
  if (eventType !== 'im.message.receive_v1') return null;

  const message = (event.message as Record<string, unknown>) ?? {};
  const sender = (event.sender as Record<string, unknown>) ?? {};
  const senderId = (sender.sender_id as Record<string, unknown>) ?? {};

  const chatId = typeof message.chat_id === 'string' ? message.chat_id : undefined;
  const openId = typeof senderId.open_id === 'string' ? senderId.open_id : undefined;
  const messageType = message.message_type;
  const contentRaw = typeof message.content === 'string' ? message.content : '{}';

  let text = '';
  try {
    const parsed = JSON.parse(contentRaw) as Record<string, unknown>;
    text =
      (typeof parsed.text === 'string' && parsed.text) ||
      (typeof parsed.content === 'string' && parsed.content) ||
      '';
  } catch {
    text = contentRaw;
  }

  if (messageType !== 'text' || !text) return null;

  const threadId = chatId ?? openId ?? 'unknown';
  return { threadId, prompt: text, openId, chatId };
}

interface BotAddTarget {
  receiveId: string;
  receiveIdType: 'open_id' | 'chat_id';
}

/**
 * Extract the best "receive_id" for a welcome card from a bot-add event.
 * Prefers the triggering user's open_id; falls back to chat_id.
 */
function extractOpenIdFromBotAddEvent(
  event: Record<string, unknown>,
): BotAddTarget | null {
  const user = (event.user as Record<string, unknown>) ?? {};
  const userOpenId = typeof user.open_id === 'string' ? user.open_id : '';

  const operatorId = (event.operator_id as Record<string, unknown>) ?? {};
  const operatorOpenId =
    typeof operatorId.open_id === 'string' ? operatorId.open_id : '';

  // p2p_chat_create_v1 also has a top-level operator / user struct.
  const operator = (event.operator as Record<string, unknown>) ?? {};
  const operatorOpenIdFlat =
    typeof operator.open_id === 'string' ? operator.open_id : '';

  const openId = userOpenId || operatorOpenId || operatorOpenIdFlat;
  if (openId) {
    return { receiveId: openId, receiveIdType: 'open_id' };
  }

  const chatId = typeof event.chat_id === 'string' ? event.chat_id : '';
  if (chatId) {
    return { receiveId: chatId, receiveIdType: 'chat_id' };
  }

  return null;
}
