# lark-mcp CLI — 概要

> **原典**: https://github.com/larksuite/lark-openapi-mcp
> **CLI リファレンス**: https://github.com/larksuite/lark-openapi-mcp/blob/main/docs/reference/cli/cli.md
> **npm**: `@larksuiteoapi/lark-mcp`
> **保存日**: 2026-04-14

---

## 位置づけ

`@larksuiteoapi/lark-mcp` は「Lark OpenAPI を MCP ツールとして公開するリファレンス実装」
ですが、同時に 3 サブコマンドを備えた **CLI ツール** でもあります。
本プロジェクト `lark-master-mcp` はこの CLI を **中心機能として再利用** します。

ユーザー指示 (2026-04-14):
> 「Lark CLI を機能の中心として考えてくれると嬉しいです。
>  一番圧倒的に使えるツール、機能が多いです。」

## 起動方法

グローバルインストール不要。常に `npx` 経由で実行可能:

```bash
npx -y @larksuiteoapi/lark-mcp <subcommand> [flags]
```

## サブコマンド一覧

| サブコマンド | 役割 | 詳細 |
|---|---|---|
| `login` | ユーザー OAuth フローを起動し user_access_token をローカル保存 | [login.md](./login.md) |
| `logout` | 保存済みトークンを削除 (単一 App / 全 App) | [logout.md](./logout.md) |
| `mcp` | MCP サーバ起動。100+ の Lark API ツールを提供 | [mcp.md](./mcp.md) |

## 3 コマンドの関係

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  login   │──────▶│  (token  │──────▶│   mcp    │
│          │       │   store) │       │          │
└──────────┘       └──────────┘       └──────────┘
                        ▲
                        │
                   ┌────┴─────┐
                   │  logout  │
                   └──────────┘
```

1. `login` で OAuth 同意画面を経て `user_access_token` をローカルに保存
   (`~/.lark-mcp/tokens/` 付近。詳細は upstream の実装依存)。
2. `mcp` は保存されたトークンを自動で読み込み、MCP クライアント (Claude Desktop 等) に
   Lark API ツールを公開する。
3. `logout` で当該 App または全 App のトークンを削除。

## 重要な共通フラグ

どのサブコマンドでも受け取る共通の引数:

- `-a, --app-id <id>`
- `-s, --app-secret <secret>`
- `-d, --domain <url>` — 既定値は `https://open.feishu.cn`。
  - International (Lark) 使用時は `https://open.larksuite.com` を明示指定。
  - Mainland China (Feishu) 使用時は既定値のまま、あるいは `https://open.feishu.cn`。

## 本プロジェクトでの活用パターン

| 目的 | 対応コマンド (lark-master) | 内部で呼ぶ upstream コマンド |
|---|---|---|
| 初回セットアップ | `lark-master setup` | `lark-mcp login` + プロファイル保存 |
| トークン再取得 | `lark-master login` | `lark-mcp login` |
| トークン削除 | `lark-master logout` | `lark-mcp logout` |
| MCP サーバ常駐 | Claude が自動起動 | `lark-mcp mcp --oauth --token-mode user_access_token` |
| 手動デバッグ実行 | `lark-master serve` | `lark-mcp mcp` を stdio でフォアグラウンド実行 |
| 診断 | `lark-master doctor` | `lark-mcp --version` など |

## 依存関係のフォールバック戦略

`lark-master` は `@larksuiteoapi/lark-mcp` を **peer dependency 相当** で扱います:

1. `node_modules/.bin/lark-mcp` があればそちらを優先して spawn。
2. なければ `npx -y @larksuiteoapi/lark-mcp` を fallback として spawn。
3. バージョン検出は `lark-mcp --version` を 1 回実行して keep。

これにより初回実行でも追加 `npm install` 不要で動作します。
