import { Hono } from 'hono';
import type { Env } from '../env.ts';
import { verifyLarkEvent } from '../lark/verify.ts';

type Bindings = { Bindings: Env };

export const cardAction = new Hono<Bindings>();

/**
 * Handles Lark Interactive Card button callbacks.
 *
 * Lark expects a fast synchronous reply (a "card action ack") or it will show
 * a loading spinner forever. For anything long-running, we ACK immediately and
 * dispatch the brain update through ConversationDO.
 */
cardAction.post('/lark/card-action', async (c) => {
  const rawBody = await c.req.text();

  const v = await verifyLarkEvent({
    rawBody,
    headers: c.req.raw.headers,
    verificationToken: c.env.LARK_VERIFICATION_TOKEN,
    encryptKey: c.env.LARK_ENCRYPT_KEY,
  });
  if (!v.ok) return c.json({ ok: false, reason: v.reason }, 401);

  const payload = v.decryptedBody as Record<string, unknown>;

  // Challenge handshake (same endpoint reused by Lark for verification)
  if (payload.type === 'url_verification' && typeof payload.challenge === 'string') {
    return c.json({ challenge: payload.challenge });
  }

  const action = (payload.action as Record<string, unknown>) ?? {};
  const actionValue = (action.value as Record<string, unknown>) ?? {};
  const openId =
    typeof payload.open_id === 'string' ? payload.open_id : undefined;
  const chatId =
    typeof payload.open_chat_id === 'string' ? payload.open_chat_id : undefined;
  const threadId = chatId ?? openId ?? 'unknown';

  // Encode button press into a prompt the brain can act on
  const prompt = `[card_action] ${JSON.stringify(actionValue)}`;

  const doId = c.env.CONVERSATION.idFromName(threadId);
  const stub = c.env.CONVERSATION.get(doId);
  c.executionCtx.waitUntil(
    stub
      .fetch('https://do/enqueue', {
        method: 'POST',
        body: JSON.stringify({
          threadId,
          openId,
          chatId,
          prompt,
          eventType: 'card_action',
          originalPayload: payload,
        }),
      })
      .catch((err) => console.error('[card-action] DO enqueue failed', err)),
  );

  // Toast hint — shown briefly in the Lark client while brain is running
  return c.json({
    toast: { type: 'info', content: 'Working on it…' },
  });
});
