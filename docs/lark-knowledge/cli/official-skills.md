# @larksuite/cli — 公式 AI Agent Skills

> **原典**: https://github.com/larksuite/cli
> **導入日**: 2026-04-14
> **導入時バージョン**: lark-cli v1.0.9 (23 スキル)

`@larksuite/cli` (npm: `@larksuite/cli`, binary: `lark-cli`) は Lark/Feishu Open Platform 公式
CLI で、14 業務ドメイン・200+ コマンド・2500+ API エンドポイント・**22+ AI Agent Skills** を
提供します。

## これが本プロジェクトの「心臓部 Vol. 2」

当初のプランでは `@larksuiteoapi/lark-mcp` (100+ MCP ツール) を中心に据えていましたが、
`@larksuite/cli` は **CLI + Agent Skills** の二本立てで Claude Code / Codex / Cursor / Gemini
CLI / GitHub Copilot 等の主要 AI コーディング環境を **公式サポート** しています。

`lark-master-mcp` はこれら **2 つの upstream を併用** します:

| Upstream | 役割 | 場所 |
|---|---|---|
| `@larksuite/cli` | 対話的 CLI + AI Agent Skills | `.agents/skills/lark-*` (`.claude/skills/` からシンボリックリンク) |
| `@larksuiteoapi/lark-mcp` | MCP サーバ (Claude Desktop への常駐ツール提供) | `claude_desktop_config.json` 経由 |

## インストール (実行済み)

```bash
# CLI 本体
npx -y @larksuite/cli --version    # => lark-cli version 1.0.9

# Agent Skills (プロジェクトスコープ)
npx -y skills add larksuite/cli -y

# または全ドメイン指定 + グローバル
npx -y skills add larksuite/cli -g -y

# 特定ドメインだけ
npx -y skills add larksuite/cli -s lark-calendar -y
npx -y skills add larksuite/cli -s lark-im -y
```

インストール後の配置:

```
.agents/skills/                    ← 汎用 (Codex/Cursor/Gemini/Copilot/Amp 他)
├── lark-shared/        (基盤 - 必ず最初に参照)
├── lark-calendar/
├── lark-im/
├── lark-doc/
├── lark-drive/
├── lark-sheets/
├── lark-slides/
├── lark-base/
├── lark-task/
├── lark-mail/
├── lark-contact/
├── lark-wiki/
├── lark-event/
├── lark-vc/
├── lark-whiteboard/
├── lark-whiteboard-cli/
├── lark-minutes/
├── lark-openapi-explorer/
├── lark-skill-maker/
├── lark-attendance/
├── lark-approval/
├── lark-workflow-meeting-summary/
└── lark-workflow-standup-report/

.claude/skills/                    ← Claude Code 用シンボリックリンク
└── lark-* (上記全てへシンボリックリンク)
```

## 3 層コマンドモデル

lark-cli は 3 つの粒度でコマンドを提供:

### レイヤー 1: ショートカット (`+` プレフィクス)

人間 / AI が最も速く使える高レベルコマンド。スマートデフォルト付き。

```bash
lark-cli calendar +agenda
lark-cli im +messages-send --chat-id "oc_xxx" --text "Hello"
lark-cli docs +create --title "Weekly Report"
lark-cli contact +search-user --query "John"
```

### レイヤー 2: API コマンド (100+)

Open Platform エンドポイントに 1:1 マッピング。構造化された引数で型安全。

```bash
lark-cli calendar calendars list
lark-cli calendar events instance_view --params '{"calendar_id":"primary","start_time":"1700000000","end_time":"1700086400"}'
```

### レイヤー 3: 生 API 呼び出し (2500+)

任意の Lark OpenAPI を直叩き:

```bash
lark-cli api GET /open-apis/calendar/v4/calendars
lark-cli api POST /open-apis/im/v1/messages --params '{"receive_id_type":"open_id"}' --data '{...}'
```

## 主要フラグ

| フラグ | 用途 |
|---|---|
| `--params <json>` | URL / クエリパラメータ |
| `--data <json>` | リクエストボディ (POST / PATCH / PUT / DELETE) |
| `--as user\|bot\|auto` | 実行主体切替 (ユーザー / Bot / 自動) |
| `--format json\|pretty\|table\|ndjson\|csv` | 出力フォーマット |
| `--page-all` | 自動ページング (全ページ取得) |
| `--page-size <N>` / `--page-limit <N>` / `--page-delay <MS>` | ページング制御 |
| `-o, --output <path>` | バイナリレスポンスの保存先 |
| `--jq <expr>` / `-q <expr>` | jq フィルタ |
| `--dry-run` | 実行せずリクエスト内容をプレビュー |

## 認証コマンド (`auth` サブコマンド)

| コマンド | 用途 |
|---|---|
| `lark-cli auth login` | ユーザー OAuth ログイン (authorize URL を発行しブラウザ同意を待機) |
| `lark-cli auth logout` | 現在のプロファイルのトークンを削除 |
| `lark-cli auth status` | ログイン状態確認 |
| `lark-cli auth check` | 現在のトークンで API が呼べるかテスト |
| `lark-cli auth scopes` | 現在付与されているスコープ一覧 |
| `lark-cli auth list` | 全プロファイルのログイン状態 |

フラグ:
- `--domain calendar,task` — ドメインフィルタ
- `--recommend` — 自動承認可能なスコープを自動承認
- `--scope "calendar:calendar:read"` — 明示スコープ指定
- `--no-wait` — Agent 向けのノンブロッキングモード

## 初回セットアップ (`config init`)

```bash
# 新規プロファイル作成 + authorize URL 発行
lark-cli config init --new
```

`lark-shared` スキルの指示に従い、Claude は **バックグラウンド** でこのコマンドを実行し、出力から
authorize URL を抽出してユーザーに提示する設計。これが **「Lark 開発者コンソールを触らない」
実現方法** の公式ルートです。

## 実行主体 (Identity) の使い分け

| 実行主体 | フラグ | 取得方法 | 用途 |
|---|---|---|---|
| user | `--as user` | `lark-cli auth login` | 個人リソース (自分のカレンダー / Docs / Base) |
| bot | `--as bot` | 自動 (appId + appSecret のみ) | App 自身のリソース / Bot として送信 |

**重要な注意**:

- Bot 主体ではユーザー個人の日程・Docs・Drive・Mail は **見えません** (例: `--as bot` で日程取得
  すると Bot 自身の空カレンダーが返ります)
- Bot 主体では **ユーザー代理操作も不可** (Bot 名義での送信・作成になります)
- Bot スコープは開発者コンソールで申請するだけで利用可 (`auth login` 不要)
- User スコープは **コンソールで申請 + ユーザーが `auth login` で承認** の 2 段階が必要

この挙動は `.agents/skills/lark-shared/SKILL.md` に詳細記述されています。

## Claude Code からの使い方

1. 新しい Claude Code セッションを開始すると `.claude/skills/lark-*` が自動ロード
2. ユーザーが Lark 関連の依頼 (「今日の予定を教えて」「#general に報告送って」) をすると
   マッチする lark-* スキルが起動
3. スキルの指示通りに `lark-cli` を実行し、初回は `config init --new` から authorize URL を
   取得 → ユーザーに提示 → ブラウザ同意 → トークン保存
4. 以降は保存されたトークンで自動呼び出し

## `@larksuiteoapi/lark-mcp` との使い分け

| 要件 | 推奨 |
|---|---|
| Claude Desktop に MCP サーバとして常駐 | `@larksuiteoapi/lark-mcp` (MCP ツール 100+) |
| Claude Code セッション内で CLI 的に操作 | `@larksuite/cli` + 公式スキル (CLI 3 層 + 2500+ API) |
| スクリプト / CI から叩く | `@larksuite/cli` (CLI 層が豊富) |
| 細かなスコープ / 実行主体切替 | `@larksuite/cli` (`--as` / `--scope`) |
| カスタム MCP ツールを自作 | `@larksuiteoapi/node-sdk` を直接 import |

本プロジェクト `lark-master-mcp` の設計方針: **両方を同居** させ、ユーザーの文脈に応じて
lark-cli スキル経由 (対話) / lark-mcp 経由 (MCP クライアント) の両方から Lark を操作できる
状態を維持する。

## 前提条件

- Node.js (npm/npx)
- Go v1.23+ および Python 3 (ソースビルド時のみ必要。通常は npm 経由で不要)

## 既知の制約

- `@larksuite/cli` の `config init` は依然として初回に Lark Open Platform で作成された
  Custom App の App ID / App Secret を要求する (詳細は [dev-console-manual.md](../dev-console-manual.md))
- `auth login` は browser redirect による OAuth なので、ヘッドレス環境では authorize URL を
  コピーして別端末で開く必要あり
- `--as bot` は `auth login` 不要だがユーザーリソースにアクセス不能

## 参考リンク

- GitHub: https://github.com/larksuite/cli
- Issues: https://github.com/larksuite/cli/issues
- Agent Skills ドキュメント: https://github.com/larksuite/cli#agent-skills
- Open Platform ドキュメント: https://open.feishu.cn/document/
