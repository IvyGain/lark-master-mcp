# lark-mcp login

> **原典**: https://github.com/larksuite/lark-openapi-mcp/blob/main/docs/reference/cli/cli.md

ユーザー ID でログインし、personal data 用の access token を取得するコマンド。

内部的には **HTTP サーバを立ち上げ、OAuth 認可コードを受信する callback エンドポイント**
を公開します (ブラウザ同意フロー)。

## 基本構文

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a <app_id> \
  -s <app_secret> \
  [--domain https://open.larksuite.com] \
  [--host localhost] \
  [--port 3000] \
  [--scope "scope1 scope2 ..."]
```

## 全パラメータ

| パラメータ | 省略形 | 既定値 | 説明 |
|---|---|---|---|
| `--app-id` | `-a` | — | アプリケーション ID |
| `--app-secret` | `-s` | — | アプリケーションシークレット |
| `--domain` | `-d` | `https://open.feishu.cn` | Feishu/Lark API のドメイン。既定値は `https://open.feishu.cn` |
| `--host` | — | `localhost` | OAuth callback を受信する待ち受けホスト |
| `--port` | `-p` | `3000` | 待ち受けポート |
| `--scope` | — | *全許可済みスコープ* | OAuth 権限。既定ではアプリに付与されたすべての権限 |

## 典型ユースケース

### (1) International (Lark) での初回ログイン

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx \
  -s yyyyy \
  --domain https://open.larksuite.com
```

ブラウザが自動で開き Lark の OAuth 同意画面 → 承認後 `http://localhost:3000/callback` に
リダイレクト → CLI がトークンを保存して終了。

### (2) Mainland China (Feishu) での初回ログイン

```bash
npx -y @larksuiteoapi/lark-mcp login -a cli_xxxx -s yyyyy
# domain 省略で https://open.feishu.cn 既定
```

### (3) ポート衝突を避けたい場合

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx -s yyyyy \
  --port 4578 \
  --domain https://open.larksuite.com
```

注意: このポートは **App の Redirect URI** として開発者コンソール側に登録済みでなければ
OAuth が成立しません。既定 3000 を使うのが最も安全。

### (4) スコープを絞り込みたい場合

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx -s yyyyy \
  --scope "im:message calendar:calendar bitable:app docx:document"
```

スコープは [oauth/scopes.md](../oauth/scopes.md) 参照。

## トークン保存先

upstream の実装依存 (概ね `~/.lark-mcp/` 配下)。
`lark-master` は upstream の保存場所には直接触れず、`lark-mcp logout` 経由で管理します。

## よくあるエラー

| エラー | 原因 | 対処 |
|---|---|---|
| `redirect_uri_mismatch` | App に Redirect URI 未登録 | 開発者コンソールで `http://localhost:<port>/callback` を登録 |
| `invalid_scope` | 要求スコープが App に未付与 | コンソールで該当スコープを申請・承認 |
| `EADDRINUSE :3000` | ポート 3000 使用中 | `--port` で別ポート指定 + コンソール側も更新 |

## lark-master からの呼び出し例

```ts
// src/commands/login.ts (本プロジェクト側)
import { execa } from 'execa';
await execa('npx', [
  '-y', '@larksuiteoapi/lark-mcp', 'login',
  '-a', profile.appId,
  '-s', profile.appSecret,
  '--domain', profile.domain,
  '--scope', profile.scopes.join(' '),
], { stdio: 'inherit' });
```
