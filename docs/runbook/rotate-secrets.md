# Runbook: シークレットのローテーション

フルインストールをやり直さずに意味のあるローテーションが可能な 5 つのシークレットに
ついて、その手順を説明します。いずれの手順もダウンタイムを発生させないように設計
されています。

信頼境界については `docs/architecture/security.md` を参照してください。

## 対象一覧

| シークレット | 管理元 | 保存場所 |
|------------|-------|---------|
| `LARK_APP_SECRET` | Lark 開発者コンソール | Worker (`wrangler secret`) |
| `LARK_VERIFICATION_TOKEN` | Lark 開発者コンソール | Worker (`wrangler secret`) |
| `LARK_ENCRYPT_KEY` | Lark 開発者コンソール | Worker (`wrangler secret`) |
| `BRAIN_SHARED_SECRET` | 自前 | Worker + Brain コンテナの環境変数 |
| `ANTHROPIC_API_KEY` | Anthropic コンソール | Brain コンテナの環境変数 (+ Worker 経由の転送用) |

原則: 新しいシークレットが両側で有効になる前に、古いシークレットを削除しては
いけません。Lark 系のシークレットについては dual-accept モードが存在しないため、
Lark 開発者コンソールと Worker を短い同一ウィンドウ内で *必ず* 切り替えてください。

---

## 1. `LARK_APP_SECRET` のローテーション

影響: lark-cli およびサーバー間 API 呼び出しで再認証が必要になります。

1. Lark 開発者コンソールで新しい App Secret を生成し、値をコピーします。
2. Worker 側で以下を実行します:
   ```bash
   cd apps/webhook
   wrangler secret put LARK_APP_SECRET     # 新しい値を貼り付け
   wrangler deploy
   ```
3. brain のイメージに lark-cli トークンを焼き込んでいる場合 (本来は避けるべきで、
   実行時の `lark-cli config init` を推奨) は、新しい App Secret を使うように
   イメージを再ビルドしてください。
4. CLI を使っているマシンで `lark-cli auth status` を再実行し、必要であれば
   `lark-cli config init` で認証情報を更新します。
5. Lark 開発者コンソールで古い App Secret を失効させます。

### 検証チェックリスト

- [ ] ローテーション後、`wrangler tail` で Lark Open API からの 401 が出ていない。
- [ ] `lark-cli auth status` が期待する App ID をエラーなく表示する。
- [ ] Bot へのテストメッセージに対して引き続き返信が返ってくる。

---

## 2. `LARK_VERIFICATION_TOKEN` のローテーション

影響: 切り替え中のウィンドウの間、受信した Lark イベントの署名検証が失敗します。
ウィンドウは 30 秒以内に収めてください。

1. Lark 開発者コンソールで新しいトークンを生成しますが、まだ保存はしません。
2. Worker 側で以下を実行します:
   ```bash
   wrangler secret put LARK_VERIFICATION_TOKEN
   wrangler deploy
   ```
3. すぐに Lark 開発者コンソールで新しいトークンを保存し、Event Subscription URL の
   「Verify」をクリックします。
4. `wrangler tail` を 1 分ほど観察し、`audit` に署名拒否のログが出ていないことを
   確認します。

### 検証チェックリスト

- [ ] ローテーション後、Lark 開発者コンソールの Event URL に対する「Verify」が OK を返す。
- [ ] 新しいテストメッセージに対して `wrangler tail` が `/lark/event` の 200 を表示する。
- [ ] `audit` に `kind='signature_failed'` の新しい行が増えていない。

---

## 3. `LARK_ENCRYPT_KEY` のローテーション

影響: verification token と同様で、Lark が新しい鍵で暗号化する一方で Worker が古い
鍵で復号しようとする短いウィンドウが発生します。

1. Lark 開発者コンソールで新しい Encrypt Key を生成します。
2. ```bash
   wrangler secret put LARK_ENCRYPT_KEY
   wrangler deploy
   ```
3. Lark 開発者コンソールで新しい鍵を保存します。

### 検証チェックリスト

- [ ] Lark からのテストメッセージに対して引き続き返信カードが返ってくる。
- [ ] `wrangler tail` に `decrypt_failed` のエントリが出ていない。

---

## 4. `BRAIN_SHARED_SECRET` のローテーション (ゼロダウンタイム)

影響: dual-accept を使う場合はゼロ。

brain 側を、ローテーション中に `BRAIN_SHARED_SECRET` と `BRAIN_SHARED_SECRET_NEXT` の
両方を受理できるように改修しておくべきです。その改修が入るまでは、後述の「高速版」
手順を使ってください。

### Dual-accept 版

1. 新しいシークレットを生成します: `NEW=$(openssl rand -base64 48)`。
2. brain コンテナに `BRAIN_SHARED_SECRET_NEXT=$NEW` を設定します:
   ```bash
   fly secrets set BRAIN_SHARED_SECRET_NEXT="$NEW" -a lark-brain
   ```
   コンテナが再起動し、これで新旧両方の値が受理される状態になります。
3. Worker を切り替えます:
   ```bash
   cd apps/webhook
   wrangler secret put BRAIN_SHARED_SECRET     # NEW を貼り付け
   wrangler deploy
   ```
4. brain 側で `NEXT` をプライマリに昇格させ、古い値を削除します。
   ```bash
   fly secrets set BRAIN_SHARED_SECRET="$NEW" -a lark-brain
   fly secrets unset BRAIN_SHARED_SECRET_NEXT -a lark-brain
   ```

### 高速版 (短いウィンドウあり)

dual-accept がまだ実装されていない場合:

1. brain 側で `fly secrets set BRAIN_SHARED_SECRET="$NEW"` を実行します。
2. 直ちに Worker 側で `wrangler secret put BRAIN_SHARED_SECRET` と
   `wrangler deploy` を実行します。
3. この間に発生した Lark イベントは brain から 401 が返りますが、Lark が
   リトライしてくれます。

### 検証チェックリスト

- [ ] `curl -H "Authorization: Bearer $NEW" $BRAIN_URL/healthz` が 200 を返す。
- [ ] `curl -H "Authorization: Bearer $OLD" $BRAIN_URL/healthz` が 401 を返す。
- [ ] Bot へのテストメッセージに対して引き続き返信が返ってくる。

---

## 5. `ANTHROPIC_API_KEY` のローテーション

影響: なし。Anthropic の API キーは自由にローテーション可能です。

1. Anthropic コンソールで新しいキーを発行します。
2. ```bash
   fly secrets set ANTHROPIC_API_KEY="sk-ant-..." -a lark-brain
   ```
3. Worker 側にも転送用のコピーがある場合は更新します:
   ```bash
   cd apps/webhook
   wrangler secret put ANTHROPIC_API_KEY
   wrangler deploy
   ```
4. 数分経過してから Anthropic コンソールで古いキーを失効させます。

### 検証チェックリスト

- [ ] Bot へのテストメッセージに対して引き続き返信が返ってくる。
- [ ] 5 分以内に Anthropic コンソール上で新しいキーの使用量が表示される。
- [ ] `fly logs -a lark-brain` に `api.anthropic.com` からの 401 が出ていない。

---

## 関連ドキュメント

- `docs/architecture/security.md`
- `docs/runbook/deploy.md`
- `docs/runbook/incident.md`
