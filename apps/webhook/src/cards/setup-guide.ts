/**
 * Setup Guide Card - Sent to admin when bot is first added
 *
 * This card provides a checklist of required configurations and
 * direct links to Lark Developer Console settings.
 */

export function setupGuideCard(appId: string): Record<string, unknown> {
  const consoleUrl = `https://open.larksuite.com/app/${appId}`;
  const scopesUrl = `${consoleUrl}/permissions/scopes`;
  const redirectUrl = `${consoleUrl}/security/redirect`;
  const botUrl = `${consoleUrl}/robot`;

  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: {
        tag: 'plain_text',
        content: '🔧 Lark Master セットアップガイド',
      },
      subtitle: {
        tag: 'plain_text',
        content: '以下の設定を完了してください',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            'Bot を追加いただきありがとうございます！🎉\n\n' +
            '完全に機能させるには、**Lark Developer Console** で以下の設定が必要です。',
        },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**ステップ 1: OAuth Redirect URI の設定**',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'plain_text',
          content: '以下のURLを Redirect URLs に追加してください：',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '```\nhttp://localhost:4000/api/lark/oauth/callback\n```',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🔗 Redirect URI 設定を開く' },
            type: 'primary',
            url: redirectUrl,
          },
        ],
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**ステップ 2: OAuth Scopes（権限）の追加**',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            '以下の権限を追加してください：\n\n' +
            '**必須の権限:**\n' +
            '- ✅ `im:message` - メッセージ送信\n' +
            '- ✅ `im:message.p2p_msg` - P2Pメッセージ\n' +
            '- ✅ `im:message.group_at_msg` - グループメッセージ\n' +
            '- ✅ `im:chat` - チャット管理\n' +
            '- ✅ `im:chat:readonly` - チャット情報読取\n' +
            '- ✅ `contact:user.id:readonly` - ユーザーID読取\n' +
            '- ✅ `contact:user.base:readonly` - ユーザー基本情報\n\n' +
            '**オプション（機能を有効化する場合）:**\n' +
            '- `calendar:calendar` - カレンダー管理\n' +
            '- `calendar:calendar_event` - イベント管理\n' +
            '- `docx:document` - ドキュメント操作\n' +
            '- `bitable:app` - Bitable操作\n' +
            '- `drive:drive` - ドライブ操作',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🔑 権限設定を開く' },
            type: 'primary',
            url: scopesUrl,
          },
        ],
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**ステップ 3: Bot 機能の有効化**',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'plain_text',
          content: 'Bot 機能を有効化してください（まだの場合）',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🤖 Bot 設定を開く' },
            type: 'default',
            url: botUrl,
          },
        ],
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**設定完了後の確認:**',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'plain_text',
          content: '1. http://localhost:4000 にアクセス\n2. 「Larkでログイン」ボタンをクリック\n3. 権限を承認\n4. 完了！',
        },
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '💡 設定に問題がある場合は、このチャットで「help」と送信してください。',
          },
        ],
      },
      {
        tag: 'hr',
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '📖 Developer Console を開く' },
            type: 'default',
            url: consoleUrl,
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '✅ 設定完了を確認' },
            type: 'primary',
            value: { action: 'verify_setup' },
          },
        ],
      },
    ],
  };
}

/**
 * Setup verification card - Sent after admin clicks "Verify Setup"
 */
export function setupVerificationCard(
  redirectUriOk: boolean,
  scopesOk: boolean,
  botOk: boolean
): Record<string, unknown> {
  const allOk = redirectUriOk && scopesOk && botOk;

  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: allOk ? 'green' : 'orange',
      title: {
        tag: 'plain_text',
        content: allOk ? '✅ 設定完了！' : '⚠️ 一部の設定が不足しています',
      },
    },
    elements: [
      {
        tag: 'div',
        fields: [
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**Redirect URI**\n${redirectUriOk ? '✅ 設定済み' : '❌ 未設定'}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**OAuth Scopes**\n${scopesOk ? '✅ 設定済み' : '❌ 不足'}`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**Bot 機能**\n${botOk ? '✅ 有効' : '❌ 無効'}`,
            },
          },
        ],
      },
      allOk
        ? {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content:
                '🎉 すべての設定が完了しました！\n\n' +
                '早速使ってみましょう：\n' +
                '1. 「今日の予定を教えて」\n' +
                '2. 「議事録のドキュメントを作って」\n' +
                '3. 「#general にメッセージを送って」',
            },
          }
        : {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '❌マークの項目を完了してから、もう一度「設定完了を確認」をクリックしてください。',
            },
          },
    ],
  };
}

/**
 * Quick setup card for experienced admins
 */
export function quickSetupCard(appId: string): Record<string, unknown> {
  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'turquoise',
      title: {
        tag: 'plain_text',
        content: '⚡ クイックセットアップ',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            '**必要な設定（コピペ用）:**\n\n' +
            '**1. Redirect URI:**\n' +
            '```\nhttp://localhost:4000/api/lark/oauth/callback\n```\n\n' +
            '**2. Scopes:**\n' +
            '```\nim:message\n' +
            'im:message.p2p_msg\n' +
            'im:message.group_at_msg\n' +
            'im:chat\n' +
            'im:chat:readonly\n' +
            'contact:user.id:readonly\n' +
            'contact:user.base:readonly\n' +
            'calendar:calendar\n' +
            'calendar:calendar_event\n' +
            'docx:document\n' +
            'bitable:app\n' +
            'drive:drive\n' +
            '```',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🚀 Developer Console を開く' },
            type: 'primary',
            url: `https://open.larksuite.com/app/${appId}`,
          },
        ],
      },
    ],
  };
}
