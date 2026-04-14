import { Hono } from 'hono';
import type { Env } from '../env.ts';
import { verifyLarkEvent } from '../lark/verify.ts';
import { sendCard, sendText } from '../lark/api.ts';
import { helpCard, examplesCard } from '../cards/welcome.ts';

type Bindings = { Bindings: Env };

export const cardAction = new Hono<Bindings>();

/**
 * Handles Lark Interactive Card button callbacks.
 *
 * Lark expects a fast synchronous reply (a "card action ack") within ~3s or it
 * shows a loading spinner forever. We therefore:
 *   1. Verify signature / decrypt payload.
 *   2. Look at `action.value.action` and dispatch to a small table of known
 *      button handlers. These fire-and-forget their side effects via
 *      `waitUntil` and return a toast immediately.
 *   3. For anything unknown, fall back to the brain enqueue path through
 *      ConversationDO (same as a regular user message).
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
  const actionName =
    typeof actionValue.action === 'string' ? actionValue.action : undefined;

  // Resolve the user's open_id from the several places Lark may put it.
  const event = (payload.event as Record<string, unknown> | undefined) ?? {};
  const operator = (payload.operator as Record<string, unknown> | undefined) ?? {};
  const eventOperator =
    (event.operator as Record<string, unknown> | undefined) ?? {};
  const openId =
    (typeof payload.open_id === 'string' && payload.open_id) ||
    (typeof operator.open_id === 'string' && operator.open_id) ||
    (typeof payload.user_id === 'string' && payload.user_id) ||
    (typeof eventOperator.open_id === 'string' && eventOperator.open_id) ||
    undefined;

  const chatId =
    typeof payload.open_chat_id === 'string' ? payload.open_chat_id : undefined;

  // Small helper: toast response body
  const toast = (type: 'info' | 'success' | 'error', content: string) =>
    c.json({ toast: { type, content } });

  // --- Dispatch table ---------------------------------------------------
  switch (actionName) {
    case 'authorize_opened': {
      // The button is a link button — it already opened the browser. Nothing
      // to send back, just acknowledge with a toast.
      return toast('info', 'ブラウザで認可画面を開きました');
    }

    case 'show_help': {
      if (openId) {
        c.executionCtx.waitUntil(
          sendCard(c.env, openId, helpCard()).catch((err) =>
            console.error('[card-action] show_help sendCard failed', err),
          ),
        );
      }
      return toast('info', '使い方を送信しました');
    }

    case 'show_examples': {
      if (openId) {
        c.executionCtx.waitUntil(
          sendCard(c.env, openId, examplesCard()).catch((err) =>
            console.error('[card-action] show_examples sendCard failed', err),
          ),
        );
      }
      return toast('info', '例文を送信しました');
    }

    case 'try_example': {
      if (openId) {
        c.executionCtx.waitUntil(
          sendText(
            c.env,
            openId,
            '試しに「今日の予定を教えて」と話しかけてみてください 🙂',
          ).catch((err) =>
            console.error('[card-action] try_example sendText failed', err),
          ),
        );
      }
      return toast('info', '例文を送信しました');
    }

    default: {
      // Unknown / missing action → forward to the brain via ConversationDO.
      const threadId = chatId ?? openId ?? 'unknown';
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

      return toast('info', 'Working on it…');
    }
  }
});
