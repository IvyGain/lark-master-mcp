# OAuth Scopes — 最小権限セット

`lark-master-mcp` の既定ユースケース (Messenger / Calendar / Docs / Base) に必要な
スコープ一覧。

> ⚠️ **注意**: Lark のスコープ名は Open Platform 側で随時追加・リネームされます。
> 本ドキュメントは **2026-04-14 時点の推定値** です。実装時に
> https://open.larksuite.com/document/server-docs/application-v6/scope
> を参照して確定し、ここを上書きしてください。

## カテゴリ別一覧

### Messenger (im)

| スコープ | 用途 |
|---|---|
| `im:message` | メッセージ全般の読み書き |
| `im:message:send_as_bot` | Bot としてメッセージ送信 |
| `im:message.group_at_msg` | グループチャットの @ 付きメッセージ |
| `im:message.p2p_msg` | DM メッセージ |
| `im:chat` | チャット情報取得 |
| `im:chat:readonly` | チャット情報読み取り専用 |
| `im:resource` | メッセージ内リソース (画像・ファイル) |

### Calendar

| スコープ | 用途 |
|---|---|
| `calendar:calendar` | カレンダー全般 |
| `calendar:calendar:readonly` | カレンダー読み取り専用 |
| `calendar:calendar.free_busy:readonly` | 空き時間参照 |
| `calendar:calendar_event` | イベント全般 |
| `calendar:calendar_event:readonly` | イベント読み取り専用 |

### Docs (新 Docx)

| スコープ | 用途 |
|---|---|
| `docx:document` | ドキュメント全般 |
| `docx:document:readonly` | ドキュメント読み取り専用 |
| `docs:doc` | 旧 Docs 互換 (必要なら) |

### Base (Bitable)

| スコープ | 用途 |
|---|---|
| `bitable:app` | Base アプリ全般 (作成・更新・削除) |
| `bitable:app:readonly` | 読み取り専用 |
| `bitable:record` | レコード全般 |
| `bitable:record:readonly` | レコード読み取り専用 |

### Drive (添付ファイル操作)

| スコープ | 用途 |
|---|---|
| `drive:drive` | Drive 全般 |
| `drive:file` | ファイル個別操作 |
| `drive:file:readonly` | 読み取り専用 |

### Contact (人名解決)

| スコープ | 用途 |
|---|---|
| `contact:user.id:readonly` | open_id ↔ 他ID 変換 |
| `contact:user.base:readonly` | ユーザー基本情報 |
| `contact:department.base:readonly` | 部署情報 |

### Wiki (任意)

| スコープ | 用途 |
|---|---|
| `wiki:wiki` | Wiki 全般 |
| `wiki:wiki:readonly` | 読み取り専用 |

---

## 既定プロファイルが要求するスコープ

`lark-master setup` で **デフォルト選択** にするスコープセット (実用的かつ最小):

```text
im:message
im:chat:readonly
calendar:calendar
calendar:calendar_event
docx:document
bitable:app
bitable:record
drive:drive
contact:user.id:readonly
contact:user.base:readonly
```

## Reader モード (読み取り専用プロファイル)

チーム共有 Bot 等で「壊さない」ことを保証したい場合:

```text
im:chat:readonly
calendar:calendar:readonly
calendar:calendar_event:readonly
docx:document:readonly
bitable:app:readonly
bitable:record:readonly
drive:file:readonly
contact:user.base:readonly
```

## スコープを login / mcp に渡す方法

### `lark-mcp login --scope`

スペース区切り:

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx -s yyyy \
  --domain https://open.larksuite.com \
  --scope "im:message calendar:calendar bitable:app docx:document"
```

### `lark-mcp mcp --scope`

`--oauth` と組み合わせた際の再認証要求スコープ:

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a cli_xxxx -s yyyy \
  --oauth --token-mode user_access_token \
  --domain https://open.larksuite.com \
  --scope "im:message calendar:calendar bitable:app docx:document"
```

## 開発者コンソール側の事前準備

スコープは **App 側で申請・組織管理者が承認** されている必要があります。
手順は [dev-console-manual.md](../dev-console-manual.md) の「スコープ申請」セクション参照。

## 検証方法

```bash
# 現在のトークンがどのスコープを持っているか確認
npx -y @larksuiteoapi/node-sdk  # 的な軽量スクリプトで GET /authen/v1/user_info を叩く
```

`lark-master doctor` はこれを内部で実行し、要求スコープと実付与スコープの差分をレポートします。
