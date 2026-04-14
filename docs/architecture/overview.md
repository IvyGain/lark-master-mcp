# アーキテクチャ概要

`lark-master-mcp` は、ユーザーが Lark (Feishu) を 2 つの独立したエントリポイントから
操作できるようにするモノレポです。

1. **デスクトップでの音声操作** — voiceOS がローカルで動作する MCP サーバーに話しかけます。
2. **スマートフォン / Lark クライアント** — Lark ボットに送られたメッセージを
   Cloudflare Worker が受け取り、Node.js の「ブレイン」コンテナへ委譲します。

どちらのエントリポイントも、最終的には `@larksuite/cli` (`lark-cli`) を呼び出して
Lark Open API にアクセスします。

---

## 🧩 Apps

| Path | Runtime | 役割 |
|------|---------|------|
| `apps/mcp-server/` | Local Node (stdio) | calendar / im / docs / base / drive / contact / sheets / task / mail / wiki / approval / meta にまたがる 41 個の Lark ツールを公開する MCP サーバー。`@ivygain/lark-master-mcp` として bin `lark-master-mcp` で配布されます。voiceOS および Claude Desktop から利用します。 |
| `apps/webhook/` | Cloudflare Worker (Hono) | Lark ボット用のエッジエントリ。`/lark/event`、`/lark/card-action`、`/lark/oauth/callback`、`/healthz` をルーティングします。D1 データベース、KV キャッシュ、および `ConversationDO` という Durable Object を所有します。 |
| `apps/brain/` | Node.js コンテナ (Hono) | 推論の中核。`POST /invoke` を公開します。Lark 専用のシステムプロンプト、lark-cli のみに制限された `Bash` ツール、および `send_reply_text` / `send_reply_card` / `log_step` を公開する子プロセスの stdio MCP とともに `@anthropic-ai/claude-agent-sdk` の `query()` を実行します。 |
| `apps/web/` | Next.js 15 on Vercel | `/` のマーケティングランディングと OAuth 後の `/connected` ページ。「Add to Lark」インストールボタンをホストします。 |

---

## ⚙️ ハイレベル図

```
                                  ┌────────────────────────────┐
                                  │        voiceOS / Claude    │
                                  │           Desktop          │
                                  └──────────────┬─────────────┘
                                                 │ stdio
                                                 ▼
                                  ┌────────────────────────────┐
                                  │ apps/mcp-server            │
                                  │  (local Node process)      │
                                  │  41 tools → lark-cli       │
                                  └──────────────┬─────────────┘
                                                 │ spawn
                                                 ▼
                                           @larksuite/cli
                                                 │
 ┌───────────────────┐                           ▼
 │   Phone / Lark    │                    Lark Open API
 │     client        │                           ▲
 └─────────┬─────────┘                           │ spawn
           │ HTTPS                               │
           ▼                                     │
 ┌───────────────────────────┐                   │
 │   apps/webhook (Worker)   │                   │
 │   Hono routes:            │                   │
 │   /lark/event             │                   │
 │   /lark/card-action       │                   │
 │   /lark/oauth/callback    │                   │
 │   /healthz                │                   │
 │                           │                   │
 │   Bindings:               │                   │
 │   - D1: DB                │                   │
 │   - KV: CACHE             │                   │
 │   - DO: CONVERSATION      │                   │
 └─────────┬─────────────────┘                   │
           │ fetch + shared secret               │
           ▼                                     │
 ┌───────────────────────────┐                   │
 │   apps/brain (Container)  │                   │
 │   POST /invoke (Hono)     │                   │
 │   runBrain() ->           │                   │
 │     Claude Agent SDK      │                   │
 │   Tools:                  │                   │
 │     - Bash (lark-cli)     │───────────────────┘
 │     - child MCP:          │
 │         send_reply_text   │
 │         send_reply_card   │
 │         log_step          │
 └───────────────────────────┘

 ┌───────────────────────────┐
 │  apps/web (Next.js 15)    │
 │  / and /connected         │
 │  "Add to Lark" button     │
 │  Vercel                   │
 └───────────────────────────┘
```

---

## 🗣 フロー A: voiceOS → mcp-server

1. voiceOS (または Claude Desktop) が `lark-master-mcp` バイナリを介して MCP
   サーバープロセスを起動し、stdio 経由で MCP を話します。
2. エージェントがツール（例: `calendar_event_create`）を選択し、呼び出します。
3. `apps/mcp-server` は入力を検証し、ユーザーのローカル認証済み CLI セッションを
   使って `lark-cli ...` を子プロセスとして spawn します
   (現状 `lark-cli auth status` は App ID `cli_a932b917a8f89e18` を bot-only として
   報告します。ユーザーログインは TODO です)。
4. stdout がパースされ、MCP ツールの結果として返却されます。
5. クラウドインフラには一切触れません。D1 も Worker も使用しません。

---

## 🧠 フロー B: スマートフォン → クラウド

1. ユーザーがスマートフォンから Lark ボットにテキストを送信します。
2. Lark が `/lark/event` で Worker に JSON イベントを POST します。
3. Worker は Lark の署名を検証し、（`LARK_ENCRYPT_KEY` が設定されていれば）復号し、
   `header.event_type` でルーティングします。
4. メッセージイベントの場合、Worker は
   `(tenant_key, chat_id, thread_id | open_id)` から `session_id` を導出し、
   その id の `ConversationDO` インスタンスにペイロードを転送します。
5. Durable Object はその会話に対する唯一のライターです。以下を行います:
   - ユーザーメッセージを D1 の `messages` に追記します。
   - `BRAIN_URL` (`POST /invoke`) のブレインコンテナを `BRAIN_SHARED_SECRET`
     ヘッダとともに呼び出します。
   - ブレインの応答を待ちます。
6. ブレイン内部では `runBrain()` が `@anthropic-ai/claude-agent-sdk` の `query()` を
   起動します。SDK は次のことができます:
   - `Bash` を実行できますが、`lark-cli …` 呼び出しのみに制限されます
     (ポリシープロンプトと `LARK_CLI_BIN` による)。
   - 3 つのツール（返信送信やステップのログ記録）を公開する小さな子 stdio MCP
     (`dist/tools/mcp-server.js`) を呼び出せます。
7. エージェントが `send_reply_card` を選択すると、子 MCP が `lark-cli im
   send-card ...` を呼び出し、最終メッセージを Lark のユーザーに送り返します。
8. DO はそのターンを完了済みとしてマークし、アシスタントメッセージを永続化し、
   ロックを解放し、Worker に 200 を返します。

---

## 永続化

| Store | 所在 | 所有者 | 内容 |
|-------|------|--------|------|
| D1 `lark-master` | `apps/webhook` (binding `DB`) | Worker | `users`、`tokens`、`conversations`、`messages`、`audit`。スキーマは `apps/webhook/migrations/0001_init.sql` にあります。 |
| KV `CACHE` | `apps/webhook` (binding `CACHE`) | Worker | 短命なキャッシュ (例: Lark アプリアクセストークン)。 |
| Durable Object `ConversationDO` | `apps/webhook` (binding `CONVERSATION`) | Worker | `session_id` ごとの直列化。処理中のターン状態を保持し、ブレインへ転送します。 |
| コンテナ FS | `apps/brain` | Brain | ステートレス。イメージビルド時に `@larksuite/cli` がグローバルインストールされます。 |
| ローカル CLI プロファイル | ユーザーのマシン | voiceOS フローのみ | `~/.lark-cli`。クラウドフローでは使用しません。 |

---

## なぜ 2 つのエントリポイントなのか

MCP サーバーは低レイテンシのローカル音声操作向けに最適化されています。クラウド
経路はマルチテナントの Lark インストールに最適化されており、Worker の短い CPU
予算でも生き延びる必要があります。これこそが、重たい Claude Agent SDK のループを
Worker 内ではなく長命なコンテナで動作させている理由です。

どちらの経路も `@larksuite/cli` に収束するため、一方のパスで実現したツールの
カバレッジは、もう一方でも自動的に実現可能となります。

---

## 関連ドキュメント

- `docs/architecture/sequence-phone-to-cloud.md` — 1 ターンあたりのシーケンス図
- `docs/architecture/data-model.md` — D1 および Durable Object のストレージ
- `docs/architecture/security.md` — 脅威モデル
- `docs/runbook/deploy.md` — 初回デプロイのチェックリスト
