import { Hono } from 'hono';
import type { Env } from './env.ts';
import { larkEvent } from './routes/lark-event.ts';
import { cardAction } from './routes/card-action.ts';
import { oauth } from './routes/oauth.ts';

export { ConversationDO } from './do/conversation.ts';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) =>
  c.json({
    name: 'lark-master-webhook',
    version: '0.1.0',
    routes: ['/healthz', '/lark/event', '/lark/card-action', '/lark/oauth/callback'],
  }),
);

app.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }));

app.route('/', larkEvent);
app.route('/', cardAction);
app.route('/', oauth);

app.notFound((c) => c.json({ ok: false, error: 'not_found' }, 404));

app.onError((err, c) => {
  console.error('[worker] unhandled error', err);
  return c.json({ ok: false, error: err.message }, 500);
});

export default app;
