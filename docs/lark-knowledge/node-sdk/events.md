# @larksuiteoapi/node-sdk — Events & Interactive Cards

Lark Bot がメッセージ受信 / カードボタン押下を検知する **イベントサブスクリプション**
と **Interactive Card callback** の扱い方。

> **💡 NOTE**: 本プロジェクトでは MVP ではこの機能を使いません。
> `@larksuiteoapi/lark-mcp mcp --oauth` がブラウザベース OAuth を担当するため、
> チャット内ボタンによる同意 UX は任意拡張扱いです。

## Event Subscription とは

Lark Bot に送られたメッセージ、追加イベント、カードボタン押下などを HTTPS webhook で
受信する仕組み。開発者コンソールで:

1. **Event Subscription URL** を登録 (例: `https://example.com/lark/event`)
2. **Encrypt Key** / **Verification Token** を取得
3. 受信したいイベント (e.g. `im.message.receive_v1`) をチェックボックスで有効化

## node-sdk でのサーバ実装

```ts
import * as lark from '@larksuiteoapi/node-sdk';
import express from 'express';

const client = new lark.Client({
  appId: 'cli_xxxx',
  appSecret: 'yyyy',
  domain: lark.Domain.Lark,
});

const eventDispatcher = new lark.EventDispatcher({
  encryptKey: process.env.LARK_ENCRYPT_KEY!,
  verificationToken: process.env.LARK_VERIFICATION_TOKEN!,
}).register({
  'im.message.receive_v1': async (data) => {
    console.log('Received:', data.message.content);
    // bot reply
    await client.im.v1.message.reply({
      path: { message_id: data.message.message_id },
      data: {
        content: JSON.stringify({ text: 'ack from lark-master' }),
        msg_type: 'text',
      },
    });
  },
});

const app = express();
app.use('/lark/event', lark.adaptExpress(eventDispatcher, { autoChallenge: true }));
app.listen(3000);
```

## Interactive Card callback

カードのボタン押下は通常の Event とは別の **Card Action** として届きます:

```ts
const cardDispatcher = new lark.CardActionHandler(
  {
    encryptKey: process.env.LARK_ENCRYPT_KEY!,
    verificationToken: process.env.LARK_VERIFICATION_TOKEN!,
  },
  async (action) => {
    // action.action.value にカード定義時の value が入る
    if (action.action.value.type === 'consent_ok') {
      // 同意処理
      return {
        toast: { type: 'success', content: '権限を受け取りました' },
      };
    }
  },
);

app.use('/lark/card', lark.adaptExpress(cardDispatcher, { autoChallenge: true }));
```

## Interactive Card の送信

カードは JSON で定義:

```ts
await client.im.v1.message.create({
  params: { receive_id_type: 'open_id' },
  data: {
    receive_id: 'ou_xxxx',
    msg_type: 'interactive',
    content: JSON.stringify({
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: 'Lark Master セットアップ' },
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: '権限を許可してください' },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '許可する' },
              type: 'primary',
              value: { type: 'consent_ok' },
            },
          ],
        },
      ],
    }),
  },
});
```

## 本プロジェクトにおける扱い

| フェーズ | 扱い |
|---|---|
| MVP (現行プラン) | 不使用。`lark-mcp --oauth` のブラウザ同意で十分 |
| 拡張 (任意) | `lark-master bot attach` サブコマンドで "チャット内同意カード" 体験を追加可能 |

拡張を実装する場合は `src/chat-bridge/` 配下に切り出します (プラン参照)。
公開 URL が必要なため Cloudflare Tunnel / ngrok / Zrok 等の併用を前提とします。

## 参考

- README (中文): https://github.com/larksuite/node-sdk/blob/main/README.zh.md
- Event Subscription docs: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/event-subscription-guide/overview
