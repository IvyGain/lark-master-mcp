# lark-mcp — Recipes (Copy & Paste 起動行集)

典型的な利用シナリオごとの起動行テンプレート。コピペして `<app_id>` / `<app_secret>` を
置き換えるだけで動作します。

---

## 1. Claude Desktop に最小構成で組み込む (International)

```json
{
  "mcpServers": {
    "lark-master": {
      "command": "npx",
      "args": [
        "-y", "@larksuiteoapi/lark-mcp", "mcp",
        "-a", "cli_xxxxxxxxxxxxxxxx",
        "-s", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "--oauth",
        "--token-mode", "user_access_token",
        "--domain", "https://open.larksuite.com",
        "-t", "preset.default",
        "-m", "stdio"
      ]
    }
  }
}
```

## 2. Claude Desktop に最小構成で組み込む (Feishu / China)

`--domain` を省略するだけ:

```json
{
  "mcpServers": {
    "lark-master": {
      "command": "npx",
      "args": [
        "-y", "@larksuiteoapi/lark-mcp", "mcp",
        "-a", "cli_xxxx",
        "-s", "yyyy",
        "--oauth",
        "--token-mode", "user_access_token",
        "-t", "preset.default",
        "-m", "stdio"
      ]
    }
  }
}
```

## 3. 初回手動ログイン (OAuth 同意を明示的に済ませたい場合)

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx \
  -s yyyy \
  --domain https://open.larksuite.com \
  --scope "im:message calendar:calendar bitable:app docx:document"
```

ブラウザが開いたら同意ボタンを押して完了。その後 `mcp` から `--oauth` を外しても動作。

## 4. メッセージ読み書きだけの軽量構成

Claude の選択負荷を下げたい時:

```json
{
  "mcpServers": {
    "lark-im": {
      "command": "npx",
      "args": [
        "-y", "@larksuiteoapi/lark-mcp", "mcp",
        "-a", "cli_xxxx",
        "-s", "yyyy",
        "--oauth",
        "--token-mode", "user_access_token",
        "--domain", "https://open.larksuite.com",
        "-t", "preset.im"
      ]
    }
  }
}
```

## 5. カレンダー特化

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a cli_xxxx -s yyyy \
  --oauth \
  --token-mode user_access_token \
  --domain https://open.larksuite.com \
  -t preset.calendar
```

## 6. Base (Bitable) 特化

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a cli_xxxx -s yyyy \
  --oauth \
  --token-mode user_access_token \
  --domain https://open.larksuite.com \
  -t preset.bitable
```

## 7. Bot として tenant_access_token で動作 (個人権限不要)

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a cli_xxxx -s yyyy \
  --token-mode tenant_access_token \
  --domain https://open.larksuite.com \
  -t "preset.im,preset.calendar"
```

ユーザー OAuth 不要。ただし App に直接付与されたスコープ範囲でしか動作しない。

## 8. HTTP (streamable) で外部公開

MCP Gateway やリモート Claude から接続する場合:

```bash
npx -y @larksuiteoapi/lark-mcp mcp \
  -a cli_xxxx -s yyyy \
  --oauth \
  --token-mode user_access_token \
  --domain https://open.larksuite.com \
  -t preset.default \
  -m streamable \
  --host 0.0.0.0 \
  --port 8787
```

> ⚠️ 外部公開時は TLS 終端 (Cloudflare Tunnel / Caddy / Nginx) を必ず挟むこと。

## 9. 設定ファイルから読み込み

大量のフラグを JSON に逃がす場合:

```bash
npx -y @larksuiteoapi/lark-mcp mcp --config ./lark-mcp.config.json
```

`lark-mcp.config.json` 例:

```json
{
  "appId": "cli_xxxx",
  "appSecret": "yyyy",
  "domain": "https://open.larksuite.com",
  "oauth": true,
  "tokenMode": "user_access_token",
  "tools": ["preset.default"],
  "toolNameCase": "dot",
  "language": "en",
  "mode": "stdio"
}
```

## 10. lark-master 経由 (本プロジェクトのラッパ)

```bash
# 初回対話セットアップ
npx lark-master setup

# 以降は Claude Desktop が自動で mcp サーバを起動
# 手動デバッグしたい時だけ:
lark-master serve

# 別テナント切替
lark-master use work
```

---

## トラブルシュート用レシピ

### トークンが壊れた

```bash
npx -y @larksuiteoapi/lark-mcp logout -a cli_xxxx
npx -y @larksuiteoapi/lark-mcp login -a cli_xxxx -s yyyy --domain https://open.larksuite.com
```

### 動作確認 (help / version)

```bash
npx -y @larksuiteoapi/lark-mcp --version
npx -y @larksuiteoapi/lark-mcp mcp --help
```

### スコープを絞って最小権限で試験

```bash
npx -y @larksuiteoapi/lark-mcp login \
  -a cli_xxxx -s yyyy \
  --scope "im:message.send_as_bot"
```
