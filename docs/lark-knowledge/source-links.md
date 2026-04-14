# 原典リンク集

Lark エコシステムの全原典 URL。本プロジェクトのナレッジは全てここから派生しています。

## 公式ドキュメント

| リソース | URL |
|---|---|
| Lark Open Platform (International) | https://open.larksuite.com/ |
| Feishu Open Platform (Mainland China) | https://open.feishu.cn/ |
| Server API List (International) | https://open.larksuite.com/document/ukTMukTMukTM/uYTM5UjL2ETO14iNxkTN/server-api-list |
| App Management Console | https://open.larksuite.com/app |

## 公式 Server SDK (4 言語)

| 言語 | GitHub | Issues | Demo | 最低バージョン |
|---|---|---|---|---|
| Go | https://github.com/larksuite/oapi-sdk-go | https://github.com/larksuite/oapi-sdk-go/issues | https://github.com/larksuite/oapi-sdk-go-demo | Go >= 1.5 |
| Python | https://github.com/larksuite/oapi-sdk-python | https://github.com/larksuite/oapi-sdk-python/issues | https://github.com/larksuite/oapi-sdk-python-demo | Python >= 3.8 |
| Java | https://github.com/larksuite/oapi-sdk-java | https://github.com/larksuite/oapi-sdk-java/issues | https://github.com/larksuite/oapi-sdk-java-demo | Java >= 1.8 |
| Node.js | https://github.com/larksuite/node-sdk | https://github.com/larksuite/node-sdk/issues | — | Node.js |

### 各 SDK README 直リンク

- Go: https://github.com/larksuite/oapi-sdk-go/blob/v3_main/README.md
- Python: https://github.com/larksuite/oapi-sdk-python/blob/v2_main/README.md
- Java: https://github.com/larksuite/oapi-sdk-java/blob/v2_main/README.md
- Node.js: https://github.com/larksuite/node-sdk/blob/main/README.zh.md

## Lark CLI / MCP 関連

| リソース | URL |
|---|---|
| **larksuite/lark-openapi-mcp (本プロジェクトの心臓部)** | https://github.com/larksuite/lark-openapi-mcp |
| larksuite/cli | https://github.com/larksuite/cli |
| lark-openapi-mcp CLI Reference (docs/reference/cli/cli.md) | https://github.com/larksuite/lark-openapi-mcp/blob/main/docs/reference/cli/cli.md |

## npm パッケージ

| パッケージ | 用途 |
|---|---|
| `@larksuiteoapi/lark-mcp` | 100+ Lark API を公開する MCP サーバ + CLI |
| `@larksuiteoapi/node-sdk` | Lark OpenAPI 公式 Node.js SDK |

## インストールコマンド (速攻参照用)

```bash
# Go
go get -u github.com/larksuite/oapi-sdk-go/v3

# Python
pip install lark-oapi -U

# Node.js (SDK)
npm install @larksuiteoapi/node-sdk
# または
yarn add @larksuiteoapi/node-sdk

# Node.js (MCP Server + CLI) ★本プロジェクトの心臓部
npx -y @larksuiteoapi/lark-mcp mcp -a <app_id> -s <app_secret>
```

```xml
<!-- Java (Maven) -->
<dependency>
    <groupId>com.larksuite.oapi</groupId>
    <artifactId>oapi-sdk</artifactId>
    <version>{latest version}</version>
</dependency>
```

Maven Central: https://mvnrepository.com/artifact/com.larksuite.oapi/oapi-sdk

## ユーザー提示時の原文 (凍結スナップショット)

ユーザーがプロジェクト開始時に貼り付けた Server SDK 概要ページの全文は
[`server-sdk-overview.md`](./server-sdk-overview.md) に保存されています。
