# lark-mcp — Tool Presets

> **Status**: upstream `@larksuiteoapi/lark-mcp` のソースから実装時に動的抽出予定。
> 下記は本プロジェクトが想定する **代表的プリセット** のスナップショット。

## プリセットの目的

`@larksuiteoapi/lark-mcp` は 100+ のツールを公開しますが、Claude に全て見せると:

- ツール選択のノイズが増える
- プロンプト長 (token) が膨張する
- 意図しない副作用のリスクが高まる

そこで **プリセット** (preset) により機能領域ごとに束ねて有効化できます。

## 想定プリセット (実装時に upstream から確定)

| プリセット名 | 含まれる API 領域 | 典型ユースケース |
|---|---|---|
| `preset.default` | im + calendar + docx + bitable + drive (抜粋) | 汎用的な個人アシスタント (**本プロジェクト既定**) |
| `preset.im` | `im.v1.message.*`, `im.v1.chat.*` | チャット読み書き中心 |
| `preset.calendar` | `calendar.v4.calendar.*`, `calendar_event.*` | スケジューラ |
| `preset.docx` | `docx.v1.document.*`, `blocks.*` | ドキュメント作成・編集 |
| `preset.bitable` | `bitable.v1.app.*`, `table.*`, `record.*`, `field.*` | Base 運用 |
| `preset.drive` | `drive.v1.file.*`, `folder.*` | ファイル管理 |
| `preset.contact` | `contact.v3.user.*`, `department.*` | 連絡先・組織図 |
| `preset.wiki` | `wiki.v2.space.*`, `node.*` | Wiki 管理 |
| `preset.approval` | `approval.v4.instance.*` | 承認フロー |
| `preset.vc` | `vc.v1.meeting.*`, `reserve.*` | ビデオ会議 |
| `preset.task` | `task.v2.task.*`, `task_list.*` | タスク管理 |

> 🔧 **実装時 TODO**: `lark-master setup` 初回実行時に upstream CLI から
> `lark-mcp mcp --help` または内部コマンドで preset 一覧を取得し、
> このドキュメントに **実測値で上書き** する。
> `docs/lark-knowledge/cli/presets.md` 冒頭の "Verified against" 行も同時更新。

## 組み合わせ例

```bash
# 個人アシスタント (既定)
-t preset.default

# メッセージ + カレンダーだけ
-t "preset.im,preset.calendar"

# Wiki メンテ特化
-t "preset.wiki,preset.docx"

# Base 専用ツール
-t preset.bitable
```

## 個別ツールの直接指定

プリセットに含まれていないツールも個別名で追加可能:

```bash
-t "preset.im im.v1.message.reply im.v1.message.urgent"
```

ツール名の命名は `{service}.{version}.{resource}.{action}` 形式。
公式 API リファレンスの endpoint パスから導出できます。

例:
- `POST /open-apis/im/v1/messages` → `im.v1.message.create`
- `GET /open-apis/calendar/v4/calendars` → `calendar.v4.calendar.list`
- `POST /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records` →
  `bitable.v1.app.table.record.create`

## `--tool-name-case` との相互作用

上記の `dot` 形式名は `--tool-name-case dot` 時のもの。
`--tool-name-case snake` にすると以下のように変換されます:

| dot | snake |
|---|---|
| `im.v1.message.create` | `im_v1_message_create` |
| `calendar.v4.calendar.list` | `calendar_v4_calendar_list` |

Claude Desktop では `dot` の方がログ可読性が高く推奨。
