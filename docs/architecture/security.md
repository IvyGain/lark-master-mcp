# セキュリティ: 脅威モデルのスナップショット

スコープ: `apps/webhook` (Cloudflare Worker) および `apps/brain` (Node コンテナ)。
ローカルの `apps/mcp-server` 経路はユーザーのデスクトップの信頼境界を継承しており、
クラウド脅威のスコープ外です。

## 信頼境界

```
 Internet
    │
    ▼
 [Lark Open Platform]     <- signs events with LARK_VERIFICATION_TOKEN
    │
    ▼
 [Worker: apps/webhook]   <- verifies signature, decrypts, routes
    │   ConversationDO    <- single-writer per session
    │   D1, KV            <- tenant data at rest
    ▼
 [Brain: apps/brain]      <- Bearer BRAIN_SHARED_SECRET from Worker only
    │
    ▼
 [lark-cli]               <- uses app token to hit Lark Open API
    │
    ▼
 [Lark Open API]
```

## 現在実装されている対策

### 1. Lark 署名検証

- すべての `/lark/event` および `/lark/card-action` リクエストに対して、
  `LARK_VERIFICATION_TOKEN` を用いて `timestamp + nonce + raw body` に対する
  HMAC を再計算します。
- 検証に失敗したリクエストは 401 を返し、`audit` に記録されます。
- `LARK_ENCRYPT_KEY` が設定されている場合、パース前に内側のペイロードを AES で
  復号します。復号エラーも 401 になります。

### 2. Worker → Brain の共有シークレット

- ブレインの `POST /invoke` は
  `Authorization: Bearer ${BRAIN_SHARED_SECRET}` を要求します。
- 同じシークレットが Worker 側 (`wrangler secret` として) とコンテナ環境の
  両方に設定されています。シークレットが一致しないものは 401 を返します。
- ブレインはネットワークから到達可能であるため、これは公衆のアクターが
  Claude Agent SDK ループを起動し、我々の Anthropic アカウントに課金させる
  ことを防ぐ*唯一*の手段です。ルート資格情報と同様に扱ってください。

### 3. 暗黙的レートリミッタとしての DO 単一ライター

- 特定の `session_id` に対するすべてのターンは 1 つの DO インスタンスを通じて
  直列化されます。したがって、1 つの悪用スレッドが同時に消費できるのは Claude
  Agent SDK ループ 1 つのみです。
- Lark のボット単位のメッセージレートリミットと組み合わせて、これが現状
  唯一のレートリミット層です。テナントごとのグローバル上限は後で追加すべきです。

### 4. 破壊的アクションの確認

- `runBrain()` 内の Lark 専用システムプロンプトは、破壊的な `lark-cli`
  サブコマンド（例: ベースレコードの削除、会議のキャンセル）を実行する前に、
  エージェントに対して（`send_reply_card` による）確認カードの発行を指示します。
  ユーザーは「Confirm」をクリックする必要があり、それは `/lark/card-action` を
  経由して返ってきます。
- 今日時点ではこれはプロンプトによるソフトな制御です。より堅牢化されたバージョン
  では、ブレインの `Bash` ツールポリシー内で破壊的サブコマンドを拒否リストに
  入れるべきです。

### 5. シークレットは Worker/Container のシークレットストアにのみ

- Worker のシークレット 7 個はすべて `wrangler secret put` 経由で保存され、
  `wrangler.jsonc` に入ることはありません。
- ブレインのシークレットはデプロイ時にコンテナ環境変数として注入されます
  (`fly secrets set`、または Cloudflare Containers の GA 時にその相当機能)。
- git リポジトリ内にシークレットはありません。もし `.env.example` ファイルが
  ある場合、それは空のままでなければなりません。

## 既知のギャップ / TODO

### A. トークンの保存時暗号化

- `tokens.access_token` と `tokens.refresh_token` は現状、D1 にプレーンな
  UTF-8 として保存されています。D1 が漏洩すると、接続中のすべてのユーザーの
  Lark セッションが侵害されます。
- 計画: Worker シークレット `TOKEN_ENCRYPTION_KEY` (32 ランダムバイトを base64)
  を追加します。`tokens` への書き込みを AES-GCM-256 でラップし、暗号文と共に
  保存する 12 バイトのランダム IV を使用します。読み取り時に復号します。
  マイグレーションは遅延実行でも可能です（次回のリフレッシュ時に再暗号化）。

### B. 破壊的アクションの堅牢化

- エージェントプロンプトが確認を要求しますが、エージェントが直接
  `lark-cli base record delete` を発行するのを構造的にブロックするものは
  ありません。ブレインの `Bash` ツール呼び出し内にサブコマンドの許可リストを
  追加してください。

### C. テナント単位のレートリミット

- DO は 1 スレッドを直列化します。同じテナント内の 2 つの悪用スレッドは現状、
  O(threads) の同時ブレイン呼び出しのコストがかかります。
- 計画: `tenant_key` をキーとした KV ベースのトークンバケットを、DO 内で
  ブレイン呼び出しの前にチェックします。

### D. 監査ログのドレイン

- `audit` 行は D1 に永遠に残ります。スケジュール付き Worker（cron トリガー）を
  追加し、週次で R2 または Logpush にエクスポートしてください。

## シークレットのローテーション

詳細は `docs/runbook/rotate-secrets.md` を参照してください。サマリー:

| Secret | Owner | ダウンタイム? |
|--------|-------|---------------|
| `LARK_VERIFICATION_TOKEN` | Lark Dev Console + Worker | 両方を 30 秒以内に切り替え。 |
| `LARK_ENCRYPT_KEY` | Lark Dev Console + Worker | 両方を 30 秒以内に切り替え。 |
| `LARK_APP_SECRET` | Lark Dev Console + Worker | 両方を切り替え。lark-cli の再認証が必要な場合あり。 |
| `BRAIN_SHARED_SECRET` | Worker + Brain env | 2 つの Worker 環境変数経由でデュアルアクセプト期間を設けます。 |
| `ANTHROPIC_API_KEY` | Brain env | ホットスワップ可能。 |

## 脅威と緩和策

| 脅威 | 緩和策 |
|------|--------|
| 攻撃者が偽造した `/lark/event` を POST | `LARK_VERIFICATION_TOKEN` による署名検証。 |
| 攻撃者がブレインの `/invoke` を直接叩く | `BRAIN_SHARED_SECRET` の Bearer チェック。 |
| 攻撃者が Lark イベントをリプレイ | DO による `event_id` + `session_id` の重複排除。 |
| 悪意ある LLM のツール呼び出しシーケンス | システムプロンプトが `Bash` を lark-cli に制限。破壊的操作にはカード確認。 |
| D1 の漏洩 | (保留中) `tokens` カラムに AES-GCM を適用。 |
| OAuth コールバック CSRF | `/lark/oauth/callback` 内で state パラメータを検証し、KV に保存した nonce と紐付けます。 |
| シークレットの拡散 | すべてのシークレットは `wrangler secret put` / コンテナ環境変数経由。`wrangler.jsonc` や git には置きません。 |

## 関連ドキュメント

- `docs/architecture/overview.md`
- `docs/architecture/data-model.md`
- `docs/runbook/rotate-secrets.md`
- `docs/runbook/incident.md`
