# データモデル

クラウド経路の永続化はすべて `apps/webhook` の内部に存在します。ブレインコンテナは
ステートレスです。スキーマの信頼できる情報源は
`apps/webhook/migrations/0001_init.sql` です。バインディングは
`apps/webhook/wrangler.jsonc` で宣言されています:

| Binding | Kind | 役割 |
|---------|------|------|
| `DB` | D1 | users、tokens、conversations、messages、audit 用のリレーショナルストア。 |
| `CACHE` | KV | 短命なキャッシュ (例: app access token、重複排除キー)。 |
| `CONVERSATION` | Durable Object | 会話ターンの `session_id` ごとの単一ライター。 |

---

## D1: `lark-master`

テーブルは 5 つです。正確なカラム一覧はマイグレーションにあります。以下の表は
セマンティクスのサマリーです。

### `users`

ボットとやり取りしたか OAuth を完了した Lark ユーザー 1 人につき 1 行。

- 主キー: `open_id` (アプリごとに安定)。
- セカンダリ: `tenant_key`、`union_id`。
- プロフィールフィールドは `contact.user.get` で取得できる場合に埋められます。
- 初回メッセージ時に upsert されます。

### `tokens`

`apps/web` の「Add to Lark」フロー後のユーザーごとの OAuth トークン。

- `(open_id, scope_set)` ごとに 1 行。
- カラム: `access_token`、`refresh_token`、`expires_at`、`scope`、
  `created_at`、`updated_at`。
- **暗号化ステータス: TODO。** 現状は値がプレーンな UTF-8 として保存されています。
  本番投入前に、Worker シークレット（例: `TOKEN_ENCRYPTION_KEY`、32 バイト
  base64）で鍵を生成し、書き込み/読み出しを AES-GCM でラップする必要があります。
  `docs/architecture/security.md` を参照してください。

### `conversations`

`session_id` ごとに 1 行 (`(tenant_key, chat_id, thread_id | open_id)` から導出)。

- `created_at`、`last_message_at`、`turn_count`、`status`
  (`active` | `paused` | `archived`) を追跡します。
- DO による直近コンテキストのハイドレートや、ダッシュボードでのアクティブ
  スレッド一覧表示に使用されます。

### `messages`

追記のみのメッセージログ。

- カラム: `id`、`session_id`、`role` (`user` | `assistant` | `tool` |
  `system`)、`content`、`tool_name`、`tool_input`、`tool_output`、
  `created_at`。
- 1 ターンあたり 2 回書き込まれます: ユーザーメッセージ用（ブレイン呼び出しの
  前）に 1 回、最終的なアシスタント返信用（ブレインが返った後）に 1 回。
- 任意: 子 MCP の `log_step` は、可観測性のために `tool` 行を永続化できます。

### `audit`

セキュリティおよび運用担当者向けのイベント。

- 署名検証の失敗、OAuth コールバック、トークンリフレッシュ、レートリミット、
  シークレットのローテーション。
- Logpush にドレインしたり、`wrangler d1 execute` でクエリする想定です。

---

## Durable Object: `ConversationDO`

`session_id` ごとに 1 インスタンス。DO は会話の単一ライターなので、明示的な
ロックなしに直列化を実現できます。

### ストレージキー

| Key | Value | 備考 |
|-----|-------|------|
| `session_id` | `string` | この DO の識別子。`idFromName` で使った名前と一致します。 |
| `last_event_id` | `string` | Lark の再送に対する重複排除用。 |
| `in_flight` | `boolean` | ブレイン呼び出しが未応答の間に true になります。呼び出し側が fast-fail を望む場合、新規イベントを 429 で拒否します。 |
| `pending_interim` | `object` | 「Thinking…」のプレースホルダーを送ると決めた場合のスクラッチパッド。 |
| `history_cursor` | `number` | 毎ターンの再ハイドレーションを避けるための D1 `messages` へのポインタ。 |

### 並行性の保証

- Cloudflare は DO インスタンスあたり同時に 1 つの JavaScript ターンしか実行
  しないことを保証します。
- よって同一スレッドに対する 2 つのスマートフォンメッセージは同じ DO を
  通じて直列化され、ブレイン呼び出しがインターリーブすることはありません。
- スレッドをまたぐ並列性には制限はありません。異なるユーザー 2 名は異なる 2 つの
  DO にヒットします。

---

## 保存*しない*もの

- `apps/brain` にはデータベースがありません。唯一の可変状態は、現在のリクエストで
  動作している Claude Agent SDK のツールループです。
- `apps/mcp-server` にはデータベースがありません。ローカルマシン上の
  `~/.lark-cli` に依存します。
- Lark のメッセージを D1 の外部にミラーリングすることはしません。ユーザーの Lark
  受信箱が会話履歴に対するプロダクトの正です。D1 は我々の監査コピーです。

---

## マイグレーションのワークフロー

```bash
# Apply a migration locally
wrangler d1 migrations apply lark-master --local

# Apply to the remote D1
wrangler d1 migrations apply lark-master --remote
```

新しいマイグレーションは `apps/webhook/migrations/000N_*.sql` として追加し、
コミットする必要があります。デプロイ後に `0001_init.sql` を編集しないでください。

## 関連ドキュメント

- `docs/architecture/overview.md`
- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
