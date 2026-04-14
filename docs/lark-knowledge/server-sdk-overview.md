# サーバー SDK 概要

> **原典**: Lark Open Platform ドキュメント「Server SDK」ページ
> **保存日**: 2026-04-14
> **凍結理由**: プロジェクト開始時にユーザーがこのページを最重要リソースとして提示。

---

## 概要 (原文要約)

開発者が Lark のオープン機能を利用したアプリ開発を便利に進められるよう、また運用フローを簡素化するために、Open Platform は統一されたサーバー SDK を提供しています。開発者は SDK を利用することで機能を素早く実装でき、開発効率を向上させられます。

SDK が提供する主な機能:

- **構造化された入力パラメータ**
  API リクエストに対して構造化されたラッパを提供。例えば send message API では様々なメッセージ
  タイプを型付きで構築できる。

- **アクセストークンのライフサイクル管理**
  トークンの取得・リフレッシュを開発者が直接扱う必要がない。

- **明瞭で読みやすいドキュメント**
  各言語 SDK の README:
    - [Go SDK ドキュメント](https://github.com/larksuite/oapi-sdk-go/blob/v3_main/README.md)
    - [Python SDK ドキュメント](https://github.com/larksuite/oapi-sdk-python/blob/v2_main/README.md)
    - [Java SDK ドキュメント](https://github.com/larksuite/oapi-sdk-java/blob/v2_main/README.md)
    - [NodeJS SDK ドキュメント](https://github.com/larksuite/node-sdk/blob/main/README.zh.md)

- **API / Event に対するテキスト注釈と使用デモ・公式ドキュメントへのリンク**
  SDK 内にドキュメントが同梱されている。

現時点では 4 言語 (Go, Python, Java, NodeJS) がサポートされています。問題があれば各リポジトリの Issues または discussion group に報告してください。

---

## GitHub プロジェクト表

| GitHub プロジェクト | Issues | デモ | 言語 |
|---|---|---|---|
| [oapi-sdk-go](https://github.com/larksuite/oapi-sdk-go) | [Issues](https://github.com/larksuite/oapi-sdk-go/issues) | [oapi-sdk-go-demo](https://github.com/larksuite/oapi-sdk-go-demo) | Golang >= 1.5 |
| [oapi-sdk-python](https://github.com/larksuite/oapi-sdk-python) | [Issues](https://github.com/larksuite/oapi-sdk-python/issues) | [oapi-sdk-python-demo](https://github.com/larksuite/oapi-sdk-python-demo) | Python >= 3.8 |
| [oapi-sdk-java](https://github.com/larksuite/oapi-sdk-java) | [Issues](https://github.com/larksuite/oapi-sdk-java/issues) | [oapi-sdk-java-demo](https://github.com/larksuite/oapi-sdk-java-demo) | Java >= 1.8 |
| [oapi-sdk-nodejs](https://github.com/larksuite/node-sdk) | [Issues](https://github.com/larksuite/node-sdk/issues) | — | NodeJS |

---

## サーバー SDK のダウンロード

### Go

以下のコマンドを実行すると、最新版の Go SDK がインストールされます:

```shell
go get -u github.com/larksuite/oapi-sdk-go/v3
```

### Python

pip を使用して最新版の Python SDK をインストールします:

```shell
pip install lark-oapi -U
```

### Java

`pom.xml` に以下の依存関係を追加してください:

```xml
<dependency>
    <groupId>com.larksuite.oapi</groupId>
    <artifactId>oapi-sdk</artifactId>
    <version>{latest version}</version>
</dependency>
```

最新バージョンは [Maven Central](https://mvnrepository.com/artifact/com.larksuite.oapi/oapi-sdk) で確認可能。

### Node.js

- npm:
  ```shell
  npm install @larksuiteoapi/node-sdk
  ```
- yarn:
  ```shell
  yarn add @larksuiteoapi/node-sdk
  ```

---

## 関連リンク

- [Server API List](https://open.larksuite.com/document/ukTMukTMukTM/uYTM5UjL2ETO14iNxkTN/server-api-list)
- [larksuite/cli](https://github.com/larksuite/cli)
- [larksuite/oapi-sdk-python](https://github.com/larksuite/oapi-sdk-python)
- [larksuite/lark-openapi-mcp](https://github.com/larksuite/lark-openapi-mcp) ← 本プロジェクトの心臓部

---

## 本プロジェクトでの採用方針

`lark-master-mcp` は **Node.js (TypeScript)** で実装し、内部で以下を利用する:

1. **`@larksuiteoapi/lark-mcp`** — MCP サーバ本体および `login`/`logout`/`mcp` CLI。
   100+ の Lark API ツールをそのまま活用する。
2. **`@larksuiteoapi/node-sdk`** — 補助 API (例: スコープ自動申請、アプリ情報取得) を直接呼ぶ
   場合のみ使用する。メインデータフローには使わない。

Go / Python / Java SDK は参照のみ。TypeScript プロジェクトでは import しない。
