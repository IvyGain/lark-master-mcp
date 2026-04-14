# lark-mcp logout

> **原典**: https://github.com/larksuite/lark-openapi-mcp/blob/main/docs/reference/cli/cli.md

ローカルに保存された user access token を削除するコマンド。

## 基本構文

```bash
# 特定 App のトークンだけ削除
npx -y @larksuiteoapi/lark-mcp logout -a <app_id>

# 全 App のトークンを削除
npx -y @larksuiteoapi/lark-mcp logout
```

## パラメータ

| パラメータ | 省略形 | 既定値 | 説明 |
|---|---|---|---|
| `--app-id` | `-a` | — (省略可) | 指定された場合は該当アプリのトークンのみ削除。省略時は全アプリのトークンを削除 |

## ユースケース

| シナリオ | コマンド |
|---|---|
| トークンが壊れて再ログインしたい | `logout -a <id>` → `login -a <id> -s <secret>` |
| 別ユーザーとして再認証したい | `logout -a <id>` → `login` |
| 複数 App を全て初期化したい | `logout` (引数なし) |
| テナント引越し時のクリーンアップ | `logout` (引数なし) |

## lark-master からの呼び出し例

```ts
// src/commands/logout.ts
import { execa } from 'execa';

export async function logout(appId?: string) {
  const args = ['-y', '@larksuiteoapi/lark-mcp', 'logout'];
  if (appId) args.push('-a', appId);
  await execa('npx', args, { stdio: 'inherit' });
}
```

## 注意

- `logout` は **ローカルに保存された token ファイルを削除するのみ**。
  Lark サーバ側のトークン失効は行わない (トークンは期限まで有効なまま)。
- 完全失効が必要な場合は Lark Open Platform の管理画面 または
  `application/v6` 系 API を使う必要あり。
