/**
 * Interactive card templates for the Lark Master onboarding flow.
 *
 * Card schema: Lark interactive card (config + header + elements).
 * The "value" field on button actions is echoed back to /lark/card-action
 * so the Worker can route flow transitions without needing the brain.
 */

import type { Env } from '../env.ts';

const DEFAULT_SCOPES = [
  'im:message',
  'im:message.group_at_msg',
  'im:message.p2p_msg',
  'im:chat',
  'im:chat:readonly',
  'calendar:calendar',
  'calendar:calendar_event',
  'docx:document',
  'bitable:app',
  'bitable:record',
  'drive:drive',
  'contact:user.id:readonly',
  'contact:user.base:readonly',
];

/**
 * Build the Lark OAuth authorize URL. The user clicks the button, Lark shows
 * a consent screen, then redirects to /lark/oauth/callback on the Worker.
 */
export function buildAuthorizeUrl(env: Env, state: string): string {
  const domain = env.LARK_DOMAIN || 'https://open.larksuite.com';
  const redirectUri =
    env.LARK_OAUTH_REDIRECT_URI ||
    `${env.PUBLIC_WORKER_ORIGIN || 'https://lark-master.example.com'}/lark/oauth/callback`;
  const url = new URL(`${domain}/open-apis/authen/v1/index`);
  url.searchParams.set('app_id', env.LARK_APP_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', DEFAULT_SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

/**
 * Welcome card shown the moment the bot is added to a user's private chat.
 * Three buttons:
 *  - 権限を許可する  → opens the authorize URL in a browser (link button)
 *  - 使い方を見る    → card-action, shows help card
 *  - 試してみる      → card-action, triggers a first-run example
 */
export function welcomeCard(env: Env, openId: string): Record<string, unknown> {
  const state = `onboarding:${openId}`;
  const authorizeUrl = buildAuthorizeUrl(env, state);

  return {
    schema: '2.0',
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    header: {
      template: 'turquoise',
      title: {
        tag: 'plain_text',
        content: '🎉 Lark Master へようこそ',
      },
      subtitle: {
        tag: 'plain_text',
        content: 'AI があなたの Lark を全部動かします',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            'はじめまして。私は **Lark Master** です。\n' +
            'カレンダー、ドキュメント、Base、メッセージ、タスク — あなたの Lark を自然言語で操作します。\n\n' +
            'まずは下のボタンから **権限を許可** してください。所要時間は 30 秒です。',
        },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            '**権限の範囲**\n' +
            '- 📅 カレンダーの閲覧・作成\n' +
            '- 💬 メッセージの送受信\n' +
            '- 📄 Docs / Base / Drive の読み書き\n' +
            '- ✅ タスクの作成・完了\n' +
            '- 👥 連絡先の参照 (open_id 解決のみ)',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '権限を許可する' },
            type: 'primary',
            multi_url: {
              url: authorizeUrl,
              android_url: authorizeUrl,
              ios_url: authorizeUrl,
              pc_url: authorizeUrl,
            },
            value: { action: 'authorize_opened' },
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '使い方を見る' },
            type: 'default',
            value: { action: 'show_help' },
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '試してみる' },
            type: 'default',
            value: { action: 'show_examples' },
          },
        ],
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content:
              '許可後、このチャットに「接続完了」カードが届きます。' +
              'もし届かない場合はもう一度ボタンを押してください。',
          },
        ],
      },
    ],
  };
}

/**
 * "Connected" card shown after a successful OAuth callback. Includes quick
 * example prompts the user can tap to copy.
 */
export function connectedCard(displayName: string): Record<string, unknown> {
  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'green',
      title: {
        tag: 'plain_text',
        content: '✅ 接続が完了しました',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            `${displayName ? `**${displayName}** さん、` : ''}権限の承認ありがとうございます 🎉\n\n` +
            '以下のように話しかけてみてください:',
        },
      },
      {
        tag: 'div',
        fields: [
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**📅 カレンダー**\n> 「今日の予定を教えて」\n> 「明日の10時から1時間で打ち合わせを入れて」',
            },
          },
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**📄 ドキュメント**\n> 「議事録のドキュメントを作って」\n> 「今週の進捗を Base に追加して」',
            },
          },
          {
            is_short: false,
            text: {
              tag: 'lark_md',
              content: '**💬 メッセージ**\n> 「#general にデプロイ完了と送って」',
            },
          },
        ],
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '使い方をもっと見る' },
            type: 'default',
            value: { action: 'show_help' },
          },
        ],
      },
    ],
  };
}

/**
 * Help card — quick reference of what the bot can do.
 */
export function helpCard(): Record<string, unknown> {
  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: '📖 Lark Master の使い方' },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            '自然言語でそのまま指示してください。Claude が意図を理解し、必要な Lark API を自動で呼び出します。',
        },
      },
      {
        tag: 'hr',
      },
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: '**📅 Calendar**\n予定 / 空き時間 / 招待' } },
          { is_short: true, text: { tag: 'lark_md', content: '**💬 Messenger**\nチャット / カード / Bot 招待' } },
          { is_short: true, text: { tag: 'lark_md', content: '**📄 Docs**\n作成 / 取得 / 編集' } },
          { is_short: true, text: { tag: 'lark_md', content: '**📊 Base**\nテーブル / レコード / ビュー' } },
          { is_short: true, text: { tag: 'lark_md', content: '**🗂 Drive / Wiki**\nファイル / Wiki ノード' } },
          { is_short: true, text: { tag: 'lark_md', content: '**✅ Task**\n作成 / 割当 / 完了' } },
          { is_short: true, text: { tag: 'lark_md', content: '**📧 Mail**\n送信 / 下書き / 検索' } },
          { is_short: true, text: { tag: 'lark_md', content: '**🎬 VC / Minutes**\n会議検索 / 議事録' } },
        ],
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content:
              '💡 破壊的な操作 (削除・却下など) は実行前に必ず確認カードが表示されます。',
          },
        ],
      },
    ],
  };
}

/**
 * Examples card — copy-and-paste style prompts to get started.
 */
export function examplesCard(): Record<string, unknown> {
  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'purple',
      title: { tag: 'plain_text', content: '✨ すぐに試せる例文' },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            '以下の一文をそのままコピーして送るだけで動きます。\n\n' +
            '1. 「今日の予定を教えて」\n' +
            '2. 「来週火曜 14:00 から 1 時間で設計レビューの予定を作って」\n' +
            '3. 「議事録という名前の Doc を作って、冒頭に参加者 3 名を書いて」\n' +
            '4. 「Tasks という Base を作って、ID・タイトル・ステータスの 3 列を入れて」\n' +
            '5. 「自分に割り当てられているタスクを 5 件教えて」',
        },
      },
    ],
  };
}

/**
 * Card shown when the bot could not find a user token yet (authorize not done).
 */
export function notAuthorizedCard(env: Env, openId: string): Record<string, unknown> {
  const state = `reauthorize:${openId}`;
  const authorizeUrl = buildAuthorizeUrl(env, state);
  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      template: 'orange',
      title: { tag: 'plain_text', content: '🔐 認証が必要です' },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content:
            'あなた個人のカレンダーやドキュメントにアクセスするには、まず権限の承認が必要です。' +
            '下のボタンから 30 秒で完了します。',
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '権限を許可する' },
            type: 'primary',
            multi_url: {
              url: authorizeUrl,
              android_url: authorizeUrl,
              ios_url: authorizeUrl,
              pc_url: authorizeUrl,
            },
            value: { action: 'authorize_opened' },
          },
        ],
      },
    ],
  };
}
