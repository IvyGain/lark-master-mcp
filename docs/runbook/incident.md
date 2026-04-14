# Runbook: インシデント対応

クラウド経路で頻出する障害への対応チートシートです。シークレットのローテーションに
ついては `docs/runbook/rotate-secrets.md`、初回デプロイ手順については
`docs/runbook/deploy.md` を参照してください。

## 0. 状況把握 (まずはこれを実行)

```bash
# Worker + DO のログ (pretty フォーマット)
wrangler tail --format=pretty

# Brain コンテナのログ
fly logs -a lark-brain

# lark-cli の認証状態
lark-cli auth status

# D1 の簡易ヘルスチェック
wrangler d1 execute lark-master --remote \
  --command "SELECT COUNT(*) AS n FROM messages WHERE created_at > datetime('now','-10 minutes')"
```

---

## インシデント A: 「Bot が返信しない」

上から順にレイヤーを辿って切り分けます。最初に「赤」になったレイヤーで止めて
ください。

### A.1 Lark → Worker

- テストメッセージを送りながら `wrangler tail` を観察します。
- 期待値: 約 1 秒以内に `POST /lark/event 200`。
- 警戒すべき兆候: ログが全く出ない (Lark が Worker に到達していない)、もしくは
  401 (署名エラー)。

ログが出ない場合: Lark 開発者コンソール → Event Subscription URL を確認し、
「Verify」をクリックします。これが失敗するなら Worker の URL か Verification
Token が間違っています。

401 が出る場合: `docs/runbook/rotate-secrets.md` の §2 に従って verification
token をローテーションしてください。`audit` テーブルで `signature_failed` の行も
確認します。

### A.2 Worker → DO

- `wrangler tail` に、session_id を受理した `ConversationDO` のログが出るはずです。
- もし出ていなければ、`/lark/event` 内のルーティングコードがそのイベント種別を
  拾えていません。イベントペイロードの形を確認してください。

### A.3 DO → Brain

- `wrangler tail` に `POST $BRAIN_URL/invoke` が記録されているはずです。
- 警戒すべき兆候: タイムアウト、401、5xx。

```bash
# ローカルの作業端末から
curl -i -H "Authorization: Bearer $BRAIN_SHARED_SECRET" $BRAIN_URL/healthz
```

- 401: Worker と brain の間で `BRAIN_SHARED_SECRET` がずれています。
  `docs/runbook/rotate-secrets.md` §4 に従って再適用してください。
- Connection refused: コンテナが落ちています。`fly status -a lark-brain` を確認し、
  必要に応じて `fly deploy` または `fly machine restart` を実行します。

### A.4 Brain → lark-cli

- `fly logs -a lark-brain` を見て、Claude Agent SDK から stderr に出ているログを
  確認します。
- よくあるエラー: `lark-cli: command not found`。これはイメージビルド時のグローバル
  インストールが失われていることを意味します。brain を再ビルドして再デプロイして
  ください。

### A.5 lark-cli → Lark Open API

- `lark-cli auth status` で認証情報が失効または欠落している場合、以下を再実行します:

  ```bash
  lark-cli config init
  lark-cli auth status
  ```

- 直近で App Secret をローテーションした場合は、`lark-cli config init` を再度
  実行する必要があります。

---

## インシデント B: 「トークン期限切れ / Lark Open API から 401」

典型的な原因は `LARK_APP_SECRET` のローテーション、または KV にキャッシュされた
古い app access token です。

```bash
# キャッシュされた app access token を強制クリア
wrangler kv key delete --binding=CACHE "lark:app_access_token"

# lark-cli を再初期化
lark-cli config init
lark-cli auth status
```

直近でローテーションを行った場合は、Worker シークレットに対して `put` をやり直して
あり、かつ Worker が再デプロイされていることを必ず確認してください (シークレットの
変更は次回のデプロイまで反映されません)。

### 検証チェックリスト

- [ ] 実際のチャットに対する `lark-cli im list-messages ...` が成功する。
- [ ] 新しいテストメッセージに対して Bot が返信を返す。

---

## インシデント C: 「レートリミットに到達 / 会話が詰まっている」

症状: 一部のスレッドでは Bot が返信するが、詰まっているスレッドはタイムアウト
し続ける、または一向に応答が返らない。

DO は 1 つの `session_id` につき single-writer です。あるターンが途中で詰まると
(brain がターンの途中でクラッシュ、DO の `in_flight=true` がクリアされない等)、
そのスレッド宛の新しいイベントはその後ろにキューイングされます。

```bash
# DO のストレージを観察する
wrangler tail --format=pretty
# 該当 session_id に対する "in_flight=true" のログ行を探す。
```

緩和策:

1. **詰まった DO を強制リセット**: Worker を再デプロイすると DO が再生成され、
   インメモリ状態がクリアされます。自動クリーンアップされない in-flight の
   ストレージキーは運用でごまかすのではなく、コード側で修正すべきです。
2. **スレッド単位のポリシー調整**: より厳密な直列化やタイムアウト → キルが必要な
   場合は、`ConversationDO` を更新して N 秒後に `in_flight` を期限切れにし、
   謝罪メッセージ付きの `send_reply_text` を発行するようにしてください。
3. **テナント単位のスロットル**: 乱用がある場合は、`tenant_key` をキーとした
   KV ベースのトークンバケットを追加します。`docs/architecture/security.md` の
   「TODO: per-tenant rate limiting」項目を参照してください。

### 検証チェックリスト

- [ ] 緩和策の適用後、詰まっていたスレッドが新しいメッセージを受理する。
- [ ] 直近 10 分間で `audit` に `do_stuck` の行が追加されていない。

---

## インシデント D: 「OAuth コールバックが 500 を返す」

症状: `apps/web` の `/connected` ページが表示されない、または Worker が
`/lark/oauth/callback` で 500 を返す。

最も多い原因は Lark 開発者コンソール、Worker のシークレット、`apps/web` の環境
変数 (`NEXT_PUBLIC_LARK_REDIRECT_URI`) の間で redirect URI が一致していないこと
です。

1. 以下 3 か所の値が *一字一句* 一致しているか確認します:
   - Lark 開発者コンソール → Redirect URLs
   - `apps/web` プロジェクトで `vercel env ls` → `NEXT_PUBLIC_LARK_REDIRECT_URI`
   - Worker コード上の `/lark/oauth/callback` URL (スキーム、ホスト、パス)
2. 失敗している callback に対する `wrangler tail` を確認します。以下を探します:
   - `bad_redirect_uri` — 上記のミスマッチ。
   - `state_mismatch` — `state` nonce が KV に存在しない (ユーザーが時間を掛け
     すぎた可能性。再試行してください)。
   - `exchange_failed` — Lark が 200 以外を返しています。`LARK_APP_ID` と
     `LARK_APP_SECRET` が最新であることを確認してください。
3. `audit` テーブルで直近の `oauth_callback_failed` 行を確認します。原因が
   記録されています。

### 検証チェックリスト

- [ ] Vercel のランディングページで「Add to Lark」をクリックすると処理が完了し `/connected` に着地する。
- [ ] テストユーザーに対応する行が `users` と `tokens` に新規追加されている。
- [ ] 成功ケースにおいて `wrangler tail` に `/lark/oauth/callback 302` が表示される。

---

## 関連ドキュメント

- `docs/architecture/overview.md`
- `docs/architecture/sequence-phone-to-cloud.md`
- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
- `docs/runbook/rotate-secrets.md`
