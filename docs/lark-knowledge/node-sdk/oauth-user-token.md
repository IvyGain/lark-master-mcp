# @larksuiteoapi/node-sdk — user_access_token の OAuth 取得

ユーザー個人の権限で Lark API を呼ぶために必要な `user_access_token` を取得する
3 ステップのフロー。`lark-mcp login` が内部で行っている処理でもあります。

> **💡 注意**: `lark-master-mcp` では **このフローを自作しません**。
> `@larksuiteoapi/lark-mcp login` を spawn するだけでよいため、本ドキュメントは
> トラブルシュート時の参考資料です。

## 全体像

```
┌─────┐    ①authorize URL    ┌──────┐
│ユーザ│──────────────────────▶│ Lark │
│     │◀──────────────────────│      │
└─────┘   code 付きリダイレクト  └──────┘
   │
   │ ②code
   ▼
┌─────────────┐   POST /authen/v1/access_token   ┌──────┐
│  あなたの   │─────────────────────────────────▶│ Lark │
│ アプリ      │◀─────────────────────────────────│      │
│ (callback)  │   user_access_token + refresh    └──────┘
└─────────────┘
   │
   │ ③API 呼び出し時に Bearer で付与
   ▼
┌──────┐
│ Lark │
│  API │
└──────┘
```

## ステップ 1 — authorize URL を組み立ててブラウザへリダイレクト

```
https://open.larksuite.com/open-apis/authen/v1/index
  ?app_id=cli_xxxx
  &redirect_uri=<URL-encoded>http://localhost:3000/callback
  &scope=im:message+calendar:calendar+bitable:app+docx:document
  &state=<random>
```

| パラメータ | 必須 | 説明 |
|---|---|---|
| `app_id` | ✅ | セルフビルドアプリの App ID |
| `redirect_uri` | ✅ | 開発者コンソールに登録済みのリダイレクト URI |
| `scope` | ⚪ | 要求スコープ (スペース区切り) |
| `state` | 推奨 | CSRF 対策用の乱数 |

ブラウザでこの URL を開くと Lark の同意画面が表示され、ユーザーが承認すると
`redirect_uri` に `?code=xxx&state=xxx` 付きでリダイレクトされます。

## ステップ 2 — code を user_access_token に交換

```ts
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: 'cli_xxxx',
  appSecret: 'yyyy',
  domain: lark.Domain.Lark,
});

// Lark 公式 API: POST /open-apis/authen/v1/access_token
const res = await client.authen.v1.accessToken.create({
  data: {
    grant_type: 'authorization_code',
    code: codeFromCallback,
  },
});

// res.data には以下が含まれる
// {
//   access_token: 'u-xxxxxxxxxxxxxxxxxxxxxxxx',
//   token_type: 'Bearer',
//   expires_in: 7200,
//   refresh_token: 'ur-xxxxxxxxxxxxxxxxxxxxxx',
//   refresh_expires_in: 2592000,
//   scope: 'im:message calendar:calendar',
// }
```

## ステップ 3 — API 呼び出し時にトークンを付与

```ts
await client.calendar.v4.calendarEvent.create(
  {
    path: { calendar_id: 'primary' },
    data: { /* ... */ },
  },
  lark.withUserAccessToken(accessToken),
);
```

## リフレッシュトークンフロー

`access_token` は 7200 秒 (2 時間) で失効します。`refresh_token` を使って再取得します:

```ts
const res = await client.authen.v1.accessToken.create({
  data: {
    grant_type: 'refresh_token',
    refresh_token: savedRefreshToken,
  },
});
```

`refresh_token` 自体は 30 日程度で失効します (`refresh_expires_in` 参照)。
失効した場合はステップ 1 からやり直し = ユーザーの再同意が必要です。

## `lark-mcp --oauth` がやってくれること

- `mcp` サーバがトークンの期限を監視
- API 呼び出し時に失効 / 期限間近を検知すると自動でブラウザを開いて再認証を要求
- `refresh_token` が生きていればサイレントリフレッシュ、切れていれば新規同意フロー

これを自作しなくて済むのが `--oauth` Beta フラグの価値です。

## 保存先

`lark-mcp login` は取得したトークンを `~/.lark-mcp/` 配下に保存します (upstream 実装依存)。
`lark-master-mcp` はこのディレクトリには直接触れず、`lark-mcp login` / `logout` を通じて
間接的に管理します。

## エラー対応

| エラー | 原因 | 対処 |
|---|---|---|
| `redirect_uri_mismatch` | アプリ設定のリダイレクト URI と不一致 | コンソール側に一致する URI を登録 |
| `invalid_code` | code が期限切れ (約 5 分) | 最初からやり直し |
| `scope_not_granted` | アプリに未付与のスコープを要求 | コンソールでスコープ申請、または `--scope` 指定を減らす |
| `refresh_token_expired` | 30 日以上未使用 | ステップ 1 から再同意 |
