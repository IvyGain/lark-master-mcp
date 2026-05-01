# セットアップガイド機能 - 実装完了

## 概要

管理者が Lark Master Bot をワークスペースに追加すると、自動的にセットアップガイドが送信されます。
ユーザーは `setup` コマンドでいつでもガイドを表示できます。

## 実装内容

### 1. セットアップガイドカード (`apps/webhook/src/cards/setup-guide.ts`)

3種類のカードを実装:

#### `setupGuideCard(appId: string)`
包括的なセットアップガイド。Lark Developer Console への直接リンク付き。

**含まれる内容:**
- ステップ 1: OAuth Redirect URI の設定
  - `http://localhost:4000/api/lark/oauth/callback` を追加
  - 設定画面へのリンクボタン
- ステップ 2: OAuth Scopes（権限）の追加
  - 必須権限: `im:message`, `im:message.p2p_msg`, `im:chat`, `contact:user.id:readonly` など
  - オプション権限: `calendar:calendar`, `docx:document`, `bitable:app`, `drive:drive`
  - 権限設定画面へのリンクボタン
- ステップ 3: Bot 機能の有効化
  - Bot設定画面へのリンクボタン
- 設定完了後の確認手順
- Developer Console へのリンク
- 設定完了確認ボタン

#### `setupVerificationCard(redirectUriOk, scopesOk, botOk)`
設定確認結果を表示するカード。

**機能:**
- 各設定項目の状態を表示（✅ 設定済み / ❌ 未設定）
- すべて完了している場合は成功メッセージ
- 未完了の項目がある場合は再確認を促す

#### `quickSetupCard(appId: string)`
経験豊富な管理者向けのクイックリファレンス。

**機能:**
- コピペ用の設定値をまとめて表示
- Redirect URI と Scopes を一括表示
- Developer Console へのリンク

### 2. イベントハンドラー更新 (`apps/webhook/src/routes/lark-event.ts`)

#### Bot追加時の自動送信
```typescript
// Bot が追加された時
if (
  eventType === 'p2p_chat_create_v1' ||
  eventType === 'im.chat.member.bot.added_v1'
) {
  const target = extractOpenIdFromBotAddEvent(event);
  if (target) {
    const env = c.env;
    const { receiveId, receiveIdType } = target;
    const appId = env.LARK_APP_ID || 'your_app_id';

    // セットアップガイドカードを管理者に送信
    c.executionCtx.waitUntil(
      sendCard(env, receiveId, setupGuideCard(appId), receiveIdType).catch(
        (err) => {
          console.error('[lark/event] setup guide sendCard failed', err);
        },
      ),
    );
  }
  return c.json({ ok: true, setupGuided: true });
}
```

#### コマンド対応
```typescript
// ユーザーがいつでもセットアップガイドを表示できる
if (
  normalized === 'setup' ||
  normalized === '/setup' ||
  normalized === 'セットアップ' ||
  normalized === '設定'
) {
  const appId = env.LARK_APP_ID || 'your_app_id';
  c.executionCtx.waitUntil(
    sendCard(env, replyTo, setupGuideCard(appId), replyIdType).catch((err) =>
      console.error('[lark/event] setup guide reply failed', err),
    ),
  );
  return c.json({ ok: true, fastPath: 'setup' });
}

// クイックセットアップカード
if (
  normalized === '/quicksetup' ||
  normalized === 'quicksetup' ||
  normalized === 'クイックセットアップ'
) {
  const appId = env.LARK_APP_ID || 'your_app_id';
  c.executionCtx.waitUntil(
    sendCard(env, replyTo, quickSetupCard(appId), replyIdType).catch((err) =>
      console.error('[lark/event] quick setup reply failed', err),
    ),
  );
  return c.json({ ok: true, fastPath: 'quicksetup' });
}
```

### 3. ヘルプカード更新 (`apps/webhook/src/cards/welcome.ts`)

コマンド一覧セクションを追加:

```
**コマンド一覧**
- `help` または `/help` — この使い方カードを表示
- `setup` または `/setup` — 管理者向けセットアップガイド
- `ping` — 接続確認
- `/try` — サンプル例文を表示
```

## 使い方

### 管理者向け

1. **Bot追加時**: Bot をワークスペースに追加すると、自動的にセットアップガイドが届きます

2. **いつでも確認**: チャットで `setup` または `/setup` と入力すれば再表示できます

3. **クイックリファレンス**: `/quicksetup` でコピペ用の設定値を表示

### ユーザー向け

- チャットで `help` と入力すると、使い方とコマンド一覧が表示されます

## 動作フロー

```
1. 管理者が Bot を追加
   ↓
2. setupGuideCard が自動送信
   ↓
3. 管理者が Lark Developer Console で設定
   - Redirect URI 追加
   - Scopes 追加
   - Bot 有効化
   ↓
4. 「設定完了を確認」ボタンをクリック（将来実装）
   ↓
5. setupVerificationCard で結果表示
   ↓
6. ユーザーが OAuth ログイン可能に
```

## マルチテナント対応

- `appId` パラメータによりテナントごとに異なる Developer Console リンクを生成
- 各組織の管理者が独自に設定を完了できる
- セキュアなテナント分離（`tenant_key` による識別）

## 今後の拡張

- [x] 設定確認ボタンの実装（`apps/webhook/src/routes/card-action.ts`） - 2026-04-21 完了
  - 暫定実装：すべて「設定済み」として扱う（楽観的検証）
  - TODO: Lark Open APIを使った実際の設定検証
- [ ] 自動設定検証機能（API経由で設定状態をチェック）
  - Redirect URIs の検証
  - OAuth Scopes の検証
  - Bot 有効化状態の検証
- [ ] 設定完了率のダッシュボード

---

**実装日**: 2026-04-21
**対応 Issue**: マルチテナント SaaS 化対応
