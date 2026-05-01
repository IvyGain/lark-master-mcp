# マルチテナント対応ガイド

## 概要

Lark Masterは**マルチテナント対応**の公開アプリとして設計されています。
これにより、複数の組織（テナント）で同じアプリケーションを使用できます。

## アーキテクチャ

### マルチテナントの仕組み

```
┌─────────────────────────────────────┐
│   Lark Master（1つのアプリ）        │
│   App ID: cli_xxxxxxxxxxxxxxxx      │
└─────────────────────────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
┌─────────┐       ┌─────────┐
│ 組織A   │       │ 組織B   │
│ (tenant1)│       │ (tenant2)│
└─────────┘       └─────────┘
    ↓                   ↓
ユーザー1,2,3     ユーザー4,5,6
```

### テナント識別

各テナント（組織）は以下の情報で識別されます：

| フィールド | 説明 | 用途 |
|-----------|------|------|
| `tenant_key` | 組織の一意識別子 | トークン管理、課金、統計 |
| `open_id` | 組織内のユーザーID | メッセージ送信、ユーザー操作 |
| `union_id` | 組織を超えたユーザーID | クロステナント識別（オプション） |

## 実装状況

### ✅ 実装済み

1. **OAuth フロー**
   - 複数組織からの認証を受け付け
   - `tenant_key` を自動取得
   - 組織ごとにトークンを識別

2. **Webhook ハンドリング**
   - 各組織のイベントを個別処理
   - Durable Objectsで組織ごとの状態管理

3. **Bot メッセージング**
   - 組織ごとのユーザーにメッセージ送信
   - `app_access_token` で全組織に対応

### 🚧 実装推奨（本番環境向け）

1. **トークンストレージ**
   ```typescript
   // データベーススキーマ例（Cloudflare D1 / PostgreSQL）
   CREATE TABLE user_tokens (
     id INTEGER PRIMARY KEY,
     tenant_key TEXT NOT NULL,
     open_id TEXT NOT NULL,
     union_id TEXT,
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,
     expires_at INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     UNIQUE(tenant_key, open_id)
   );
   ```

2. **課金管理**
   - 組織ごとの利用状況追跡
   - Stripe Connect等での組織別課金

3. **使用量制限**
   - 組織ごとのAPI呼び出し制限
   - Rate limiting per tenant

## Lark Open Platform設定

### アプリの可用性設定

Lark Developer Console → あなたのアプリ → **基本情報**

**可用性**: `すべての組織` を選択

これにより、任意のLark組織のユーザーがアプリを追加できます。

### OAuth設定

**Redirect URI**（複数環境対応）:
```
https://your-production-domain.com/api/lark/oauth/callback
http://localhost:4000/api/lark/oauth/callback  # 開発環境
```

**Scopes**（必要な権限）:
- `im:message` - メッセージ送信
- `im:message.p2p_msg` - P2Pメッセージ
- `im:chat` - チャット管理
- `calendar:calendar` - カレンダー操作
- `docx:document` - ドキュメント操作
- `contact:user.base:readonly` - ユーザー情報

### アプリ公開

**ステップ1: 審査準備**
1. アプリアイコン（512x512 PNG）
2. アプリ説明（英語・中国語）
3. プライバシーポリシーURL
4. サポートURL

**ステップ2: 審査申請**
- Lark Developer Console → **公開申請**
- 審査には通常1-2週間

**ステップ3: 公開後**
- Lark App Directoryに掲載
- すべてのユーザーが検索・追加可能

## 開発ワークフロー

### ローカル開発

```bash
# 1. 環境変数設定
cp apps/web/.env.example apps/web/.env.local

# 2. App IDとSecretを設定
# .env.local:
# NEXT_PUBLIC_LARK_APP_ID=cli_your_app_id
# LARK_APP_SECRET=your_app_secret

# 3. 開発サーバー起動
cd apps/web
npm run dev

# 4. ngrokでローカルを公開（OAuth callback用）
ngrok http 4000

# 5. Lark ConsoleのRedirect URIを更新
# https://xxxx.ngrok.io/api/lark/oauth/callback
```

### 本番デプロイ

```bash
# Vercel（Web App）
cd apps/web
vercel --prod

# Cloudflare Workers（Webhook）
cd apps/webhook
wrangler deploy

# Fly.io（Brain）
cd apps/brain
fly deploy
```

## セキュリティ

### トークン管理

- ✅ `access_token` は暗号化して保存
- ✅ ログに絶対に出力しない
- ✅ HTTPS必須
- ✅ 組織ごとに分離

### データ分離

- ✅ `tenant_key` でデータを完全分離
- ✅ クロステナントアクセス防止
- ✅ 監査ログの記録

## トラブルシューティング

### 「app_id リクエストが無効です」

**原因**: プレースホルダーApp IDを使用している

**解決**: `.env.local` に実際のApp IDを設定

### 「redirect_uri_mismatch」

**原因**: Lark ConsoleのRedirect URIが一致していない

**解決**: Lark Console → セキュリティ設定 → Redirect URIを追加

### 複数組織でトークンが混在

**原因**: `tenant_key` を使わずに保存している

**解決**: トークン保存時に必ず `tenant_key` をキーに含める

## FAQ

**Q: 1つのアプリで何組織まで対応できますか？**
A: Larkの制限はありませんが、データベースとAPI Rate Limitingの設計次第です。数千組織規模でも対応可能です。

**Q: 組織ごとに異なる設定をできますか？**
A: はい。`tenant_key` をキーにして組織ごとの設定を保存できます。

**Q: 既存のセルフビルドアプリから移行できますか？**
A: はい。既存のトークンを `tenant_key` と紐付けて移行できます。

---

**Powered by Lark Master · MIT License**
