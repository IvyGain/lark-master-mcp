# lark-mcp mcp (★最重要)

> **Source**: https://github.com/larksuite/lark-openapi-mcp/blob/main/docs/reference/cli/cli.md
> **保存日**: 2026-04-14

MCP サーバを起動し、Lark OpenAPI を MCP ツールとして Claude Desktop / Claude Code /
その他 MCP クライアントに提供する **本プロジェクトの心臓部**。

100+ の Lark API ツール (Messenger / Calendar / Docs / Bitable / Drive / Contact / Wiki /
Approval / VC / Task など) を提供します。

## 基本構文

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a <app_id> \
  -s <app_secret> \
  [flags]
```

## 全フラグ一覧

### 認証系

| フラグ | 省略形 | 既定値 | 説明 |
|---|---|---|---|
| `--app-id` | `-a` | — | Application ID |
| `--app-secret` | `-s` | — | Application secret |
| `--domain` | `-d` | `https://open.feishu.cn` | API domain。International は `https://open.larksuite.com` |
| `--user-access-token` | `-u` | — | user-level API 呼び出し用のトークンを明示指定 |
| `--token-mode` | — | `auto` | `auto` / `tenant_access_token` / `user_access_token` のいずれか |
| **`--oauth`** | — | off | 🌟 **MCP Auth Server を起動し、token 期限切れ時に自動でユーザーログインを要求 (Beta)** |
| `--scope` | — | — | OAuth で要求するスコープ一覧 |

### ツール制御系

| フラグ | 省略形 | 既定値 | 説明 |
|---|---|---|---|
| `--tools` | `-t` | — | 有効化するツール (preset / 個別名) をスペース or カンマ区切り |
| `--tool-name-case` | `-c` | — | ツール名のケース変換。`snake` / `camel` / `dot` / `kebab` |
| `--language` | `-l` | — | ドキュメント言語。`zh` / `en` |

### Transport 系

| フラグ | 省略形 | 既定値 | 説明 |
|---|---|---|---|
| `--mode` | `-m` | — | MCP transport。`stdio` / `streamable` / `sse` |
| `--host` | — | — | listening host (streamable / sse 時) |
| `--port` | `-p` | — | listening port (streamable / sse 時) |

### その他

| フラグ | 省略形 | 説明 |
|---|---|---|
| `--config` | — | JSON configuration file path |
| `--version` | `-V` | Display version |
| `--help` | `-h` | Display help |

---

## 🌟 `--oauth` フラグ (AnyGen 風 UX の核)

> "Enable MCP Auth Server to get user_access_token and auto request user login when token expires (Beta)"

このフラグが本プロジェクトのユーザー体験の決め手です。

**効果**:
- `mcp` サーバに加えて OAuth コールバック用の mini HTTP サーバを同時起動
- Claude からツール呼び出しが来た時に token が失効していれば、
  **自動でブラウザを開いて再ログインを促す**
- Claude Desktop / Code 側は何もしなくても、ユーザーは同意ボタン一発で再認可

これにより「開発者コンソールを触らない」ユーザー体験が成立します。
(初回 App 登録だけは `dev-console-manual.md` の手動手順が必要)

## `--token-mode` の選び方

| 値 | 挙動 | 用途 |
|---|---|---|
| `tenant_access_token` | 常に App 自身の権限で API を呼ぶ | Bot としてメッセージ送信など |
| `user_access_token` | 常にユーザーの権限で API を呼ぶ | 個人のカレンダー / Docs / Base 操作 (**本プロジェクト既定**) |
| `auto` | API ごとに適切なトークン種を選択 | 混在環境 |

## `-t / --tools` の指定方法

スペース区切りまたはカンマ区切り。個別ツール名 / プリセット名を混在可。

```bash
# プリセット指定 (推奨)
-t preset.default

# 複数プリセット
-t "preset.im,preset.calendar,preset.docx,preset.bitable"

# 個別ツール + プリセット
-t "preset.im im.v1.message.list im.v1.message.create"
```

プリセット一覧は [presets.md](./presets.md) を参照 (実行時に確定)。

## `--tool-name-case` の使い分け

MCP クライアント側の命名規則に合わせて選ぶ:

| 値 | 例 |
|---|---|
| `snake` | `im_v1_message_create` |
| `camel` | `imV1MessageCreate` |
| `dot` | `im.v1.message.create` (既定、公式ドキュメントに一致) |
| `kebab` | `im-v1-message-create` |

Claude Desktop は `snake` または `dot` が自然に扱えます。

## `-m / --mode` の使い分け

| 値 | 用途 |
|---|---|
| `stdio` | Claude Desktop から子プロセスとして起動される場合 (**推奨**) |
| `streamable` | HTTP streamable transport (MCP Gateway 経由など) |
| `sse` | Server-Sent Events transport (レガシー MCP クライアント) |

Claude Desktop / Claude Code 連携では常に `stdio` を選びます。

---

## 本プロジェクトの既定起動行

`lark-master setup` が生成する `claude_desktop_config.json` エントリ:

```json
{
  "mcpServers": {
    "lark-master": {
      "command": "npx",
      "args": [
        "-y", "@larksuiteoapi/lark-mcp", "mcp",
        "-a", "cli_xxxxxxxxxxxxxxxx",
        "-s", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "--oauth",
        "--token-mode", "user_access_token",
        "--domain", "https://open.larksuite.com",
        "-t", "preset.default",
        "-c", "dot",
        "-l", "en",
        "-m", "stdio"
      ]
    }
  }
}
```

## カスタマイズレシピ

| やりたいこと | 追加フラグ |
|---|---|
| 日本語ドキュメント | `-l zh` (中国語のみ。英語フォールバックあり) |
| ツールを限定して Claude の選択負荷を下げる | `-t "preset.im,preset.calendar"` |
| 特定のテナントに固定 | `--domain https://open.larksuite.com` |
| OAuth 自動再認証オフ (手動 login 前提) | `--oauth` を外し、事前に `lark-mcp login` を実行 |
| HTTP リモート配信 | `-m streamable --host 0.0.0.0 --port 8787` |

詳細サンプルは [recipes.md](./recipes.md) 参照。
