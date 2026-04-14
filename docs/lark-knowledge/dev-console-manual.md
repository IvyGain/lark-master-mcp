# 開発者コンソール — 一度だけ必要な手動作業

> **対象範囲**: Lark Open Platform 開発者コンソールでの手動作業を **一回** だけ行い、
> App ID / App Secret / Redirect URI / スコープ / Bot 有効化を済ませる手順。
>
> これさえ終われば以降は `npx lark-master setup` で全自動化されます。

## 前提

- Lark アカウント (International) または Feishu アカウント (China) を保有
- 組織管理者権限 (アプリのスコープ申請に承認が必要なため)

## 手順

### 1. 開発者コンソールを開く

| 環境 | URL |
|---|---|
| International (Lark) | https://open.larksuite.com/app |
| Mainland China (Feishu) | https://open.feishu.cn/app |

本プロジェクトは **International 前提** で記述します。
(China 版は画面構成が概ね同一なので読み替え可能)

### 2. Custom App を作成

1. 右上の「Create Custom App」(カスタムアプリを作成) をクリック
2. 入力項目:
   - **App Name**: `Lark Master` (任意の表示名)
   - **App Description**: `Personal MCP gateway for Claude` などの説明
   - **App Icon**: 任意
3. 「Create」ボタンで作成

### 3. App ID / App Secret を取得

作成後、アプリの「Credentials & Basic Info」ページに遷移:

- **App ID**: `cli_xxxxxxxxxxxxxxxx` の形式
- **App Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` の形式

> 🚨 **App Secret は表示された一度きり**。コピーしてすぐ `lark-master setup` のプロンプト
> に貼り付けるか、パスワードマネージャに保存すること。

### 4. Bot 機能を有効化

左サイドバー → 「Features」→ 「Bot」:

1. 「Enable Bot」をクリック
2. Bot の表示名・アイコンを設定 (任意)
3. 保存

これにより App が個人チャットや Lark Group に追加可能になります。

### 5. Redirect URI を登録

左サイドバー → 「Security Settings」または「Development Configuration」:

- **Redirect URL**: `http://localhost:3000/callback`

`lark-mcp login` の既定ポートが 3000 なので、このまま登録してください。
別ポート (`--port 4578` など) を使う場合はここに `http://localhost:4578/callback` を追加。

### 6. Permissions & Scopes (スコープ申請)

左サイドバー → 「Permissions & Scopes」。

以下のスコープにチェックを入れて「Apply for Release」(リリース申請) を行います:

```
im:message
im:chat:readonly
calendar:calendar
calendar:calendar_event
docx:document
bitable:app
bitable:record
drive:drive
contact:user.id:readonly
contact:user.base:readonly
```

> 💡 組織管理者の承認が必要なスコープもあります。個人テスト用なら
> 「Test Enterprise」で作業していれば自分で承認できます。

### 7. Event Subscription (任意 — MVP では不要)

MVP (`--oauth` フラグによるブラウザ OAuth のみ) の場合は **スキップ可**。

チャット内ボタン同意フローを使いたい将来拡張で必要になります。その際:

- **Request URL**: 公開 URL (Cloudflare Tunnel / ngrok など)
- **Encrypt Key** / **Verification Token** を取得して保存
- 購読イベント: `im.message.receive_v1` など

### 8. Release (バージョン公開)

「Version Management & Release」→ 「Create Version」→ 組織管理者に承認依頼。

**Test Enterprise** で作業している場合は自動承認されます。
本番テナントでは承認待ちが数分〜数時間。

### 9. App をテナントにインストール

承認完了後、左サイドバー → 「App Release」→ 「Install」。
または Lark App 内で「Workplace」→「App Directory」から検索して追加。

Bot が自分の個人チャットに追加されれば準備完了。

---

## これで手動作業は終わり

取得したもの:

- ✅ **App ID**: `cli_xxxxxxxxxxxxxxxx`
- ✅ **App Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- ✅ Redirect URI 登録済み: `http://localhost:3000/callback`
- ✅ スコープ承認済み
- ✅ Bot 有効化 + テナントへインストール済み

これらを `npx lark-master setup` のプロンプトに入力するだけで:

1. プロファイル暗号化保存
2. `lark-mcp login` 経由で OAuth 同意画面を開く
3. user_access_token 取得
4. `claude_desktop_config.json` への自動追記

までが一気に完了します。

---

## よくあるハマりどころ

| 症状 | 原因 | 対処 |
|---|---|---|
| `redirect_uri_mismatch` エラー | Step 5 の URI 登録漏れ or タイプミス | 完全一致で登録し直す (末尾スラッシュ注意) |
| `scope_not_granted` エラー | Step 6 のスコープ未申請 or 未承認 | 再申請 + 管理者に承認依頼 |
| Bot がチャットに追加できない | Step 4 の Bot 有効化漏れ | Bot を Enable にして再度バージョン公開 |
| App Secret を紛失 | Step 3 で控えなかった | コンソールで "Reset Secret" → 新しい Secret で `lark-master setup` を再実行 |
| `invalid_client` エラー | App ID / Secret 誤り | コンソールで再確認 |

## 複数環境

| 用途 | 推奨構成 |
|---|---|
| 個人テスト | 個人 Lark Test Enterprise で 1 つ Custom App |
| 業務本番 | 会社テナントで別の Custom App を作成 (スコープ最小化) |
| 両立 | `lark-master setup` を 2 回実行し、プロファイル名を `personal` / `work` にして `lark-master use` で切替 |
