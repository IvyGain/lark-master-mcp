import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env.ts';

export interface BrainInvocation {
  threadId: string;
  openId?: string;
  chatId?: string;
  prompt: string;
  eventType: string;
  originalPayload: unknown;
}

/**
 * ConversationDO — per-thread serializer and brain dispatcher.
 *
 * Responsibilities:
 *  1. Serialize events for the same thread (prevents concurrent Claude calls)
 *  2. Persist inbound + outbound messages in D1
 *  3. Forward requests to the brain Container over HTTPS
 *  4. Return immediately after enqueueing so the Worker can ACK Lark in <5s
 */
export class ConversationDO extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/enqueue') {
      const invocation = (await request.json()) as BrainInvocation;
      // Fire-and-forget: the Worker already ACK'd Lark.
      // Any failure here is logged but does not block anything.
      this.ctx.waitUntil(this.processInvocation(invocation));
      return new Response(JSON.stringify({ ok: true, queued: true }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('not found', { status: 404 });
  }

  private async processInvocation(invocation: BrainInvocation): Promise<void> {
    const now = Date.now();
    try {
      await this.ensureConversation(invocation, now);
      await this.persistMessage(invocation.threadId, 'in', invocation.prompt, null, now);

      const resp = await this.callBrain(invocation);

      await this.persistMessage(
        invocation.threadId,
        'out',
        resp.reply ?? '',
        JSON.stringify(resp.tool_calls ?? []),
        Date.now(),
      );
    } catch (err) {
      console.error('[ConversationDO] processInvocation failed', err);
      // Best-effort audit
      try {
        await this.env.DB.prepare(
          'INSERT INTO audit (thread_id, lark_cli_cmd, result_status, cost_ms, created_at) VALUES (?, ?, ?, ?, ?)',
        )
          .bind(
            invocation.threadId,
            'brain_invoke',
            `error: ${(err as Error).message}`,
            Date.now() - now,
            Date.now(),
          )
          .run();
      } catch {
        // swallow
      }
    }
  }

  private async ensureConversation(inv: BrainInvocation, now: number): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO conversations (thread_id, open_id, chat_id, last_message_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(thread_id) DO UPDATE SET last_message_at = excluded.last_message_at`,
    )
      .bind(inv.threadId, inv.openId ?? null, inv.chatId ?? null, now, now)
      .run();
  }

  private async persistMessage(
    threadId: string,
    direction: 'in' | 'out',
    content: string,
    toolCallsJson: string | null,
    at: number,
  ): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO messages (thread_id, direction, content, tool_calls_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(threadId, direction, content, toolCallsJson, at)
      .run();
  }

  private async callBrain(invocation: BrainInvocation): Promise<{
    reply: string;
    tool_calls?: unknown[];
  }> {
    const sessionId = (await this.ctx.storage.get<string>('session_id')) ?? null;
    const body = JSON.stringify({
      threadId: invocation.threadId,
      sessionId,
      prompt: invocation.prompt,
      openId: invocation.openId,
      chatId: invocation.chatId,
      eventType: invocation.eventType,
      larkCtx: {
        appId: this.env.LARK_APP_ID,
        appSecret: this.env.LARK_APP_SECRET,
        domain: this.env.LARK_DOMAIN,
      },
    });

    const response = await fetch(`${this.env.BRAIN_URL}/invoke`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lark-master-secret': this.env.BRAIN_SHARED_SECRET,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`brain /invoke returned ${response.status}`);
    }
    const data = (await response.json()) as {
      reply: string;
      tool_calls?: unknown[];
      session_id?: string;
    };
    if (data.session_id) {
      await this.ctx.storage.put('session_id', data.session_id);
    }
    return data;
  }
}
