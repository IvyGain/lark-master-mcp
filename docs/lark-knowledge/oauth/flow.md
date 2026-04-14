# OAuth Flow — user_access_token ライフサイクル

`lark-master-mcp` のユーザー体験の土台となる Lark OAuth (user_access_token 方式) の流れを
実装者視点で整理。

## 参加者

- **User** — Lark アカウントを持つエンドユーザー
- **Lark Authorization Server** — `https://open.larksuite.com/open-apis/authen/v1/*`
- **Your App** — 開発者コンソールで登録された Self-built App (App ID + App Secret 保持)
- **lark-mcp login** — OAuth callback 受信用の一時 HTTP サーバ
- **lark-mcp mcp --oauth** — MCP サーバ起動中の auto re-auth ハンドラ

## 標準フロー (初回)

```
User                 lark-mcp login        Lark Auth Server       Your App
 │                        │                       │                 │
 │  1. run login          │                       │                 │
 │───────────────────────▶│                       │                 │
 │                        │                       │                 │
 │                        │ 2. spawn HTTP :3000   │                 │
 │                        │    & open browser     │                 │
 │                        │                       │                 │
 │  3. consent page       │                       │                 │
 │◀────────────────────────────────────────────── │                 │
 │                        │                       │                 │
 │  4. click "Allow"      │                       │                 │
 │───────────────────────────────────────────────▶│                 │
 │                        │                       │                 │
 │                        │ 5. redirect w/ code   │                 │
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
 │                        │ 8. save to            │                 │
 │                        │    ~/.lark-mcp/       │                 │
 │                        │                       │                 │
 │  9. "Login OK" page    │                       │                 │
 │◀────────────────────── │                       │                 │
```

1–9 が `npx lark-mcp login -a <id> -s <secret>` の一連の動作。

## トークン寿命

| トークン | 寿命 (参考値) | 再取得方法 |
|---|---|---|
| `access_token` (user) | ~7200 秒 (2h) | `refresh_token` で silent refresh |
| `refresh_token` | ~2,592,000 秒 (30d) | 失効時はユーザー再同意 (Step 1 から) |
| `tenant_access_token` | ~7200 秒 | App ID + Secret から自動再取得 (SDK 内) |

厳密な値は `expires_in` / `refresh_expires_in` レスポンスで確認すること
(Lark 側の仕様変更に追従するため)。

## `--oauth` Beta の挙動 (`lark-mcp mcp --oauth`)

```
Claude                MCP Server (lark-mcp mcp --oauth)     Lark
  │                           │                              │
  │  tool call                │                              │
  │─────────────────────────▶│                              │
  │                           │  check token                 │
  │                           │  ── valid? ──▶ call API ────▶│
  │                           │                              │
  │                           │  ── refreshable? ─▶ refresh ▶│
  │                           │                              │
  │                           │  ── expired? ─────▶          │
  │                           │   open browser to login      │
  │                           │   (blocks or returns error)  │
```

- **valid**: 即座に API 呼び出し。
- **refreshable**: `refresh_token` で silent refresh 後、API 呼び出し。
- **expired**: 新規同意フローをブラウザで開く。その間のツール呼び出しは待機またはエラー返却
  (upstream 実装依存。実機確認を `docs/design/` の検証メモに記録する)。

## 失敗時の挙動 (既定)

| ケース | 期待挙動 |
|---|---|
| refresh_token 切れ | ブラウザで新規同意画面を開き、完了後に pending リクエストを再送 |
| ネットワーク断 | MCP ツール呼び出しが `network_error` で返る → Claude が retry or 報告 |
| App ID / Secret 誤り | `login` 時点で `invalid_client` エラー |
| redirect_uri 未登録 | `redirect_uri_mismatch` エラー → `dev-console-manual.md` 参照 |

## lark-master 側の補完

upstream `--oauth` が Beta 段階であることを踏まえ、`lark-master doctor` は以下を監視:

- `~/.lark-mcp/` 配下の token ファイル存在
- `expires_at` フィールド (読めれば) と現在時刻の比較
- `lark-mcp --version` 実行結果のキャッシュ

不整合を検知したら `lark-master login` の再実行を案内。

## セキュリティ注意

- `access_token` はプロセス外に **絶対に出さない**。ログにも出力禁止。
- `~/.lark-mcp/` は chmod 600 相当が推奨 (upstream 実装に委ねつつ doctor で確認)。
- `lark-master` 側で保存する `profiles.json` 内の App Secret は libsodium secretbox で暗号化。
