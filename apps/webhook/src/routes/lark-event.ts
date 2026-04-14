import { Hono } from 'hono';
import type { Env } from '../env.ts';
import { extractChallenge, verifyLarkEvent } from '../lark/verify.ts';

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

  // Extract threadId, openId, chatId, prompt (best-effort across event types)
  const extracted = extractMessageContext(eventType, event);
  if (!extracted) {
    // Not a message we care about — still ACK so Lark doesn't retry.
    return c.json({ ok: true, skipped: eventType });
  }

  // Route to Durable Object keyed by thread
  const doId = c.env.CONVERSATION.idFromName(extracted.threadId);
  const stub = c.env.CONVERSATION.get(doId);

  // Fire the DO without awaiting the full brain run — we must ACK in < 5s
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
  if (eventType === 'im.message.receive_v1') {
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

  return null;
}
