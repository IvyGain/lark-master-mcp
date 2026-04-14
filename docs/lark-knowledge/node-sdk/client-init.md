# @larksuiteoapi/node-sdk — Client Initialization

> **Source**: https://github.com/larksuite/node-sdk/blob/main/README.zh.md

## インストール

```bash
npm install @larksuiteoapi/node-sdk
# または
yarn add @larksuiteoapi/node-sdk
```

## 基本的な Client 生成

```ts
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  // International は明示指定
  domain: lark.Domain.Lark,          // 既定は Feishu
  // あるいは URL 直接
  // domain: 'https://open.larksuite.com',
});
```

## Domain 定数

| 値 | URL |
|---|---|
| `lark.Domain.Feishu` | https://open.feishu.cn |
| `lark.Domain.Lark` | https://open.larksuite.com |

文字列で直接指定することも可能。

## App 種別

### Self-built App (Custom App)

```ts
const client = new lark.Client({
  appId: 'cli_xxxx',
  appSecret: 'yyyy',
  appType: lark.AppType.SelfBuild,  // 既定
});
```

### ISV (Marketplace App)

```ts
const client = new lark.Client({
  appId: 'cli_xxxx',
  appSecret: 'yyyy',
  appType: lark.AppType.ISV,
});

// 各 API 呼び出し時に tenantKey を指定
const result = await client.im.message.create(
  { /* ... */ },
  lark.withTenantKey('tenant_key_here'),
);
```

本プロジェクト `lark-master-mcp` は Self-built App 前提 (初回セットアップで Custom App を
作成)。

## トークン管理

Client は App ID / App Secret から **tenant_access_token** を自動取得・キャッシュ・
リフレッシュします。開発者側でトークンを直接扱う必要はありません。

```ts
// 自動でトークン付与
const res = await client.im.v1.message.create({
  params: { receive_id_type: 'open_id' },
  data: {
    receive_id: 'ou_xxxx',
    content: JSON.stringify({ text: 'hello from lark-master' }),
    msg_type: 'text',
  },
});
```

## user_access_token 付きリクエスト

ユーザーの権限で実行したい場合 (`lark-mcp mcp --token-mode user_access_token` 相当):

```ts
const res = await client.im.v1.message.create(
  { /* ... */ },
  lark.withUserAccessToken('u-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
);
```

## 本プロジェクトでの使いどころ

`lark-master-mcp` のメインデータフローは `@larksuiteoapi/lark-mcp` CLI に完全委譲するため、
`@larksuiteoapi/node-sdk` を直接 import する局面は限定的です:

- `src/admin-automation/apply-scope.ts` — 権限スコープの自動申請
- `src/admin-automation/bot-enable.ts` — Bot 機能有効化
- `src/commands/doctor.ts` — App 情報・権限一覧取得

上記以外では **使わない** こと (upstream CLI と機能重複するため)。

## 参考

- README (中文): https://github.com/larksuite/node-sdk/blob/main/README.zh.md
- Issues: https://github.com/larksuite/node-sdk/issues
