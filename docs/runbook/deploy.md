# Runbook: 初回デプロイ手順

クラウド側 (`apps/webhook`, `apps/brain`, `apps/web`) のエンドツーエンド デプロイ チェックリスト。
ローカル用 MCP サーバー (`apps/mcp-server`) は npm に別途公開するため、このランブックには含まれません。

アーキテクチャ全体像: `docs/architecture/overview.md` を参照してください。

**所要時間の目安**: 初回は約 60 分、2 回目以降は約 10 分。

## 前提条件

- Cloudflare アカウント (Workers + D1 + Durable Objects が有効になっていること)
- Fly.io アカウント (Cloudflare Containers が GA になるまでの暫定コンテナホスト)。
  Docker が動かせて公開 URL を持てる任意のホストでも代用可能。
- Vercel アカウント (`apps/web` のデプロイ先)
- Anthropic API キー
- カスタムアプリを登録できる Lark テナント
- ローカルに導入済みのツール: `wrangler`, `fly` (または `flyctl`), `vercel`, `pnpm`

---

## a) Lark カスタムアプリを登録する

`docs/lark-knowledge/dev-console-manual.md` の手順に従ってください。手順 (d) で必要になるので、
以下の 4 つの値を控えておきます。

- `App ID`
- `App Secret`
- `Verification Token`
- `Encrypt Key` (任意ですが、設定を推奨)

スコープには以下を追加してください:

- `im:message`, `im:message.group_at_msg`, `im:message.p2p_msg`, `im:chat`, `contact:user.base:readonly`
- `apps/mcp-server` の 49 ツール (calendar / base / docs / drive / sheets / task / mail / wiki / approval など) が使う各スコープ

イベント購読は有効化しておき、Request URL は空のままにしておきます。手順 (i) で設定します。

## b) D1 データベースを作成する

```bash
cd apps/webhook
wrangler login
wrangler d1 create lark-master
```

返ってきた `database_id` を `apps/webhook/wrangler.jsonc` の `d1_databases` バインディング
(`DB`) に貼り付けます。その後、マイグレーションを適用します。

```bash
wrangler d1 migrations apply lark-master --remote
```

これにより `apps/webhook/migrations/0001_init.sql` が実行され、
`users` / `tokens` / `conversations` / `messages` / `audit` の各テーブルが作成されます。

## c) KV ネームスペースを作成する

```bash
wrangler kv namespace create CACHE
```

返ってきた `id` を `apps/webhook/wrangler.jsonc` の `kv_namespaces` バインディング (`CACHE`) に
貼り付けます。

## d) Worker シークレットを設定する

全 7 個のシークレットを `wrangler secret put` 経由で設定してください
(`wrangler.jsonc` には絶対に書き込まないこと)。

```bash
wrangler secret put LARK_VERIFICATION_TOKEN
wrangler secret put LARK_ENCRYPT_KEY           # 暗号化を使わない場合はスキップ
wrangler secret put LARK_APP_ID
wrangler secret put LARK_APP_SECRET
wrangler secret put LARK_DOMAIN                # 例: https://open.feishu.cn もしくは https://open.larksuite.com
wrangler secret put ANTHROPIC_API_KEY          # brain コンテナに転送される
wrangler secret put BRAIN_SHARED_SECRET        # 32 バイト以上のランダム値
# BRAIN_URL は手順 (g) で設定します
```

`BRAIN_SHARED_SECRET` は `openssl rand -base64 48` などで生成してください。

## e) Worker をデプロイする

```bash
cd apps/webhook
wrangler deploy
```

払い出された `*.workers.dev` URL をメモしておきます。手順 (i) で使用します。

## f) Brain コンテナをビルド & デプロイする

執筆時点で Cloudflare Containers は GA になっていないため、暫定ホストとして Fly.io を使います。
brain は Node.js の標準的なコンテナで、Dockerfile 内で `@larksuite/cli` をグローバルインストール
しています。

```bash
cd apps/brain
fly launch                  # fly.toml を作成 (まだデプロイしない)
fly secrets set \
  ANTHROPIC_API_KEY='sk-ant-...' \
  BRAIN_SHARED_SECRET='Worker と同じ値' \
  LARK_DEFAULT_DOMAIN='https://open.feishu.cn' \
  LARK_CLI_BIN='lark-cli' \
  PORT='8080'
fly deploy
```

デプロイ後、公開 URL (例: `https://lark-brain.fly.dev`) を控えておいてください。これが
`BRAIN_URL` の値になります。

Cloudflare Containers が GA になったら、上記の Fly.io 手順を `wrangler containers deploy` に
置き換え、環境変数は同じままで運用できます。

## g) Worker → Brain の接続を配線する

```bash
cd apps/webhook
wrangler secret put BRAIN_URL     # https://lark-brain.fly.dev を貼り付け
wrangler deploy                   # 新しいシークレット参照を反映するため再デプロイ
```

## h) Web アプリをデプロイする

```bash
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_LARK_APP_ID
vercel env add NEXT_PUBLIC_LARK_DOMAIN
vercel env add NEXT_PUBLIC_LARK_REDIRECT_URI   # 例: https://<worker>.workers.dev/lark/oauth/callback
vercel deploy --prod
```

## i) Lark 側に Worker URL を設定する

手順 (a) で作成したカスタムアプリの Lark 開発者コンソールを開きます。

1. **Event Subscription** → Request URL に Worker URL + `/lark/event` を貼り付け、
   「Verify」をクリック。手順 (d) で設定した Verification Token と Encrypt Key を貼り付けます。
2. **Permissions** → 必要なスコープがすべて申請済み・承認済みになっていることを確認し、
   アプリを公開 (またはテストテナントに追加) します。
3. **Bot features** → Bot を有効化し、自分のテストユーザーをテスターとして追加します。
4. **Redirect URLs** (OAuth を使う場合) → Worker の `/lark/oauth/callback` URL を追加します。

## j) スモークテスト

```bash
# Worker の health チェック
curl https://<worker>.workers.dev/healthz

# Brain の health チェック (公開 Fly URL 経由。Bearer ヘッダが必要)
curl -H "Authorization: Bearer $BRAIN_SHARED_SECRET" https://lark-brain.fly.dev/healthz

# エンドツーエンドの実機確認
# Lark で Bot にダイレクトメッセージを送る。約 10 秒以内に返信が返ってくるはず。
```

何か挙動がおかしいときはログを確認してください。

```bash
wrangler tail --format=pretty       # Worker + DO のログ
fly logs -a lark-brain              # Brain コンテナのログ
lark-cli auth status                # lark-cli が Bot 認証を保持しているか確認
```

---

## 検証チェックリスト

- [ ] `wrangler d1 execute lark-master --remote --command "SELECT name FROM sqlite_master WHERE type='table'"` が `users` / `tokens` / `conversations` / `messages` / `audit` を返す。
- [ ] `wrangler secret list` で 8 個の Worker シークレットすべてが表示される (手順 (d) の 7 個 + `BRAIN_URL`)。
- [ ] `curl https://<worker>.workers.dev/healthz` が `200` を返す。
- [ ] `curl -H "Authorization: Bearer $BRAIN_SHARED_SECRET" $BRAIN_URL/healthz` が `200` を返す。
- [ ] Lark 開発者コンソールで Event Subscription URL の「Verify」が成功する。
- [ ] Bot に「ping」と送信すると 15 秒以内にアシスタントの返信カードが届く。
- [ ] ping 応答の会話が `messages` テーブルに `role='user'` と `role='assistant'` の両方で行追加されている。
- [ ] Vercel URL の `apps/web` ランディングページが表示され、「Add to Lark」ボタンと `/connected` ページが正しく動作する。
