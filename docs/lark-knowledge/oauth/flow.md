# OAuth フロー — user_access_token ライフサイクル

`lark-master-mcp` のユーザー体験の土台となる Lark OAuth (user_access_token 方式) の流れを
実装者視点で整理。

## 参加者

- **ユーザー** — Lark アカウントを持つエンドユーザー
- **Lark 認可サーバー** — `https://open.larksuite.com/open-apis/authen/v1/*`
- **あなたのアプリ** — 開発者コンソールで登録されたセルフビルドアプリ (App ID + App Secret 保持)
- **lark-mcp login** — OAuth コールバック受信用の一時 HTTP サーバー
- **lark-mcp mcp --oauth** — MCP サーバー起動中の自動再認証ハンドラ

## 標準フロー (初回)

```
ユーザー             lark-mcp login        Lark 認可サーバー     あなたのアプリ
 │                        │                       │                 │
 │  1. login を実行       │                       │                 │
 │───────────────────────▶│                       │                 │
 │                        │                       │                 │
 │                        │ 2. HTTP :3000 を起動  │                 │
 │                        │    & ブラウザを開く   │                 │
 │                        │                       │                 │
 │  3. 同意画面           │                       │                 │
 │◀────────────────────────────────────────────── │                 │
 │                        │                       │                 │
 │  4. 「許可」をクリック │                       │                 │
 │───────────────────────────────────────────────▶│                 │
 │                        │                       │                 │
 │                        │ 5. code 付きリダイレクト                │
 │                        │◀──────────────────────│                 │
 │                        │                       │                 │
 │                        │ 6. POST /authen/v1/access_token          │
 │                        │    (grant_type=authorization_code, code) │
 │                        │───────────────────────▶                 │
 │                        │                       │                 │
 │                        │ 7. { access_token,    │                 │
 │                        │      refresh_token,   │                 │
 │                        │      expires_in }     │                 │
 │                        │◀──────────────────────│                 │
 │                        │                       │                 │
 │                        │ 8. 保存               │                 │
 │                        │    ~/.lark-mcp/       │                 │
 │                        │                       │                 │
 │  9. 「ログイン成功」頁 │                       │                 │
 │◀────────────────────── │                       │                 │
```

1–9 が `npx lark-mcp login -a <id> -s <secret>` の一連の動作。

## トークン寿命

| トークン | 寿命 (参考値) | 再取得方法 |
|---|---|---|
| `access_token` (user) | 約 7200 秒 (2 時間) | `refresh_token` によるサイレントリフレッシュ |
| `refresh_token` | 約 2,592,000 秒 (30 日) | 失効時はユーザーの再同意 (ステップ 1 から) |
| `tenant_access_token` | 約 7200 秒 | App ID + Secret から自動再取得 (SDK 内) |

厳密な値は `expires_in` / `refresh_expires_in` レスポンスで確認すること
(Lark 側の仕様変更に追従するため)。

## `--oauth` Beta の挙動 (`lark-mcp mcp --oauth`)

```
Claude                MCP サーバー (lark-mcp mcp --oauth)    Lark
  │                           │                              │
  │  ツール呼び出し           │                              │
  │─────────────────────────▶│                              │
  │                           │  トークン検査                │
  │                           │  ── 有効? ──▶ API 呼び出し ─▶│
  │                           │                              │
  │                           │  ── 更新可? ─▶ リフレッシュ ▶│
  │                           │                              │
  │                           │  ── 失効? ───▶               │
  │                           │   ブラウザで再ログイン       │
  │                           │   (ブロックまたはエラー返却) │
```

- **有効**: 即座に API 呼び出し。
- **更新可能**: `refresh_token` でサイレントリフレッシュした後、API 呼び出し。
- **失効**: 新規同意フローをブラウザで開く。その間のツール呼び出しは待機またはエラー返却
  (upstream 実装依存。実機確認を `docs/design/` の検証メモに記録する)。

## 失敗時の挙動 (既定)

| ケース | 期待挙動 |
|---|---|
| refresh_token 切れ | ブラウザで新規同意画面を開き、完了後に保留中のリクエストを再送 |
| ネットワーク断 | MCP ツール呼び出しが `network_error` で返る → Claude がリトライまたは報告 |
| App ID / Secret 誤り | `login` 時点で `invalid_client` エラー |
| redirect_uri 未登録 | `redirect_uri_mismatch` エラー → `dev-console-manual.md` 参照 |

## lark-master 側の補完

upstream `--oauth` が Beta 段階であることを踏まえ、`lark-master doctor` は以下を監視します:

- `~/.lark-mcp/` 配下のトークンファイルの存在
- `expires_at` フィールド (読めれば) と現在時刻の比較
- `lark-mcp --version` 実行結果のキャッシュ

不整合を検知したら `lark-master login` の再実行を案内します。

## セキュリティ上の注意

- `access_token` はプロセス外に **絶対に出さない**。ログにも出力禁止。
- `~/.lark-mcp/` は chmod 600 相当が推奨 (upstream 実装に委ねつつ doctor で確認)。
- `lark-master` 側で保存する `profiles.json` 内の App Secret は libsodium secretbox で暗号化します。
