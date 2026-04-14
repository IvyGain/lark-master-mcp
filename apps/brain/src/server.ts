import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { z } from 'zod';
import { loadEnv } from './env.js';
import { runBrain } from './agent/query.js';

const env = loadEnv();
const app = new Hono();

const invokeSchema = z.object({
  threadId: z.string(),
  sessionId: z.string().nullable().optional(),
  prompt: z.string(),
  openId: z.string().optional(),
  chatId: z.string().optional(),
  eventType: z.string(),
  larkCtx: z.object({
    appId: z.string(),
    appSecret: z.string(),
    domain: z.string().optional(),
  }),
});

app.get('/', (c) =>
  c.json({
    name: 'lark-master-brain',
    version: '0.1.0',
    routes: ['/healthz', '/invoke'],
  }),
);

app.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }));

app.post('/invoke', async (c) => {
  // Shared-secret auth — Worker sets this header.
  const provided = c.req.header('x-lark-master-secret');
  if (provided !== env.BRAIN_SHARED_SECRET) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400);
  }

  const parsed = invokeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid_shape', detail: parsed.error.issues }, 400);
  }

  try {
    const result = await runBrain({
      threadId: parsed.data.threadId,
      sessionId: parsed.data.sessionId ?? null,
      prompt: parsed.data.prompt,
      openId: parsed.data.openId,
      chatId: parsed.data.chatId,
      eventType: parsed.data.eventType,
      larkCtx: parsed.data.larkCtx,
    });

    return c.json({
      reply: result.reply,
      session_id: result.sessionId,
      tool_calls: result.toolCalls,
      duration_ms: result.durationMs,
    });
  } catch (err) {
    console.error('[brain] runBrain failed', err);
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

app.notFound((c) => c.json({ ok: false, error: 'not_found' }, 404));

const port = env.PORT;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[lark-master-brain] listening on :${info.port}`);
});
