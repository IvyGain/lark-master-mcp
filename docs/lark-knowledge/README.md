# Lark Knowledge Base

`lark-master-mcp` プロジェクトの根幹をなす Lark エコシステムのナレッジ資産。
公式ドキュメント・SDK README・CLI リファレンスからの要約を、プロジェクト内で
常に参照できる形で保存しています。

> **位置づけ**: これは本プロジェクトの **最重要リソース** です。
> Lark Open Platform のドキュメントはしばしばリニューアル・URL 変更があるため、
> 手元に凍結しておく価値があります。

## 読み順 (初めて読む人向け)

1. **[source-links.md](./source-links.md)** — すべての原典 URL。迷ったらまずここ。
2. **[server-sdk-overview.md](./server-sdk-overview.md)** — Lark が公式提供する 4 言語 SDK
   (Go / Python / Java / Node) のインストール手順と位置づけ。
3. **[dev-console-manual.md](./dev-console-manual.md)** — 唯一の「手動」作業。
   一度だけ開発者コンソールで App を作成し、App ID / App Secret を取得する手順。
4. **[cli/overview.md](./cli/overview.md)** — `@larksuiteoapi/lark-mcp` CLI の 3 サブコマンド
   (`login` / `logout` / `mcp`) の全体像。本プロジェクトの心臓部。
5. **[cli/mcp.md](./cli/mcp.md)** — `lark-mcp mcp` の全フラグ。特に **`--oauth` (Beta)**
   と **`--token-mode user_access_token`** が AnyGen 風 UX の肝。
6. **[oauth/flow.md](./oauth/flow.md)** — user_access_token の取得・リフレッシュ・失効挙動。
7. **[oauth/scopes.md](./oauth/scopes.md)** — Messenger / Calendar / Docs / Bitable を
   カバーする最小スコープ一覧。

## ディレクトリ構成

```
docs/lark-knowledge/
├── README.md                  ← このファイル
├── source-links.md            全原典 URL
├── server-sdk-overview.md     4 言語 SDK 概要
├── dev-console-manual.md      手動 App 登録 (1 回だけ)
├── cli/
│   ├── overview.md            lark-mcp CLI 全体像
│   ├── login.md               lark-mcp login
│   ├── logout.md              lark-mcp logout
│   ├── mcp.md                 lark-mcp mcp (最重要)
│   ├── presets.md             ツールプリセット一覧
│   ├── recipes.md             典型起動行サンプル
│   └── official-skills.md     ★ @larksuite/cli 公式 Agent Skills (23 個導入済み)
├── node-sdk/
│   ├── client-init.md         @larksuiteoapi/node-sdk Client 初期化
│   ├── oauth-user-token.md    OAuth user_access_token 3 ステップ
│   └── events.md              Event Subscription / Interactive Card
└── oauth/
    ├── flow.md                user_access_token ライフサイクル
    └── scopes.md              最小スコープ一覧
```

## 更新ポリシー

- upstream (`larksuite/lark-openapi-mcp`, `larksuite/node-sdk`, etc.) がメジャーバージョンを
  出した際は各ファイル冒頭の `Verified against: vX.Y.Z` を更新する。
- 公式ドキュメント URL が 404 になった場合は Wayback Machine URL を追記。
- スコープ名や API エンドポイント名は **Lark 公式ドキュメント原文を引用** し、翻訳しない。
