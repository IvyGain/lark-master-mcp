/**
 * Improved landing page with "Login with Lark" button
 *
 * This approach combines OAuth authorization and bot installation in ONE STEP:
 * - User clicks "Login with Lark"
 * - OAuth consent screen shows BOTH user permissions AND bot installation
 * - After approval, bot is automatically added to user's workspace
 * - No need for separate Applink flow
 */

const APP_ID = process.env.NEXT_PUBLIC_LARK_APP_ID ?? 'cli_xxxxxxxxxxxxxxxx';
const LARK_DOMAIN = process.env.NEXT_PUBLIC_LARK_DOMAIN ?? 'https://open.larksuite.com';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:4000';

// OAuth scopes that include bot permissions
// IMPORTANT: These must match EXACTLY what is registered in Lark Developer Console
const SCOPES = [
  'im:message',
  'im:message.group_msg:get_as_user',
  'im:message.p2p_msg:get_as_user',
  'im:message:readonly',
  'im:chat',
  'im:chat:readonly',
  'calendar:calendar',
  'calendar:calendar.event:create',
  'calendar:calendar.event:read',
  'docx:document',
  'bitable:app',
  'drive:drive',
  'contact:user.id:readonly',
  'contact:user.base:readonly',
  'contact:user.employee_id:readonly',
  'offline_access',
];

/**
 * Build OAuth authorize URL with bot installation
 * When user approves, BOTH user permissions and bot are granted simultaneously
 */
function buildLoginUrl(): string {
  const url = new URL(`${LARK_DOMAIN}/open-apis/authen/v1/index`);
  url.searchParams.set('app_id', APP_ID);
  url.searchParams.set('redirect_uri', `${WEB_URL}/api/lark/oauth/callback`);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', 'login_from_web');
  return url.toString();
}

export default function LandingPage() {
  const loginUrl = buildLoginUrl();

  return (
    <main style={wrap}>
      <section style={hero} aria-labelledby="hero-title">
        <div style={eyebrow}>LARK MASTER</div>
        <h1 id="hero-title" style={h1}>
          ひとつのBotで、Larkのすべてを。
          <br />
          Claudeが動かします。
        </h1>
        <p style={lead}>
          自然言語でお願いするだけで、カレンダー、ドキュメント、Base、ドライブ、メッセージが自動で連携します。スマートフォンからもデスクトップからも、同じBotが応えます。
        </p>

        <div style={ctaRow}>
          {/* 改善版：直接OAuthログインへ */}
          <a
            href={loginUrl}
            style={primaryCta}
            rel="noopener noreferrer"
          >
            🚀 Larkでログイン →
          </a>
          <a href="/install" style={secondaryCta}>
            インストール手順を見る
          </a>
        </div>

        <p style={fineprint}>
          ワンクリックで連携完了。Bot追加と権限承認が同時に行われます。
          <br />
          <code>@larksuite/cli</code> と Claude Agent SDK を基盤にしています。
        </p>
      </section>

      <section style={section} aria-labelledby="capabilities-title">
        <h2 id="capabilities-title" style={h2}>できること</h2>
        <div style={grid}>
          {CAPABILITIES.map((c) => (
            <div key={c.title} style={card}>
              <div style={cardTitle}>{c.title}</div>
              <div style={cardBody}>{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" style={section} aria-labelledby="how-title">
        <h2 id="how-title" style={h2}>使い方の流れ</h2>
        <ol style={steps}>
          <li>
            <strong>Larkでログイン を押す</strong> — 上のボタンから認証します。Bot追加と権限承認が同時に完了します。
          </li>
          <li>
            <strong>Botに話しかける</strong> — Larkの任意のチャットで「明日14時に佐藤さんと30分レビューを入れて」のように伝えます。
          </li>
          <li>
            <strong>Claudeが計画して実行</strong> — リクエストを<code>lark-cli</code>呼び出しに分解し、破壊的操作はカードで確認してから実行します。
          </li>
          <li>
            <strong>どこからでも使える</strong> — PCがオフでもスマートフォンから操作できます。stdio MCPサーバーとしても動作するため、音声エージェントやClaude DesktopからもLarkを操作できます。
          </li>
        </ol>
      </section>

      <footer style={footer}>
        <span>Lark Master · MIT · Built with Claude Agent SDK</span>
        <a href="https://github.com/IvyGain/lark-master-mcp" style={{ color: '#6a6a6a' }}>
          GitHub
        </a>
      </footer>
    </main>
  );
}

const CAPABILITIES = [
  {
    title: 'カレンダー',
    body:
      '「今日の予定は？」「15時の会議を木曜に移動して」「30分のレビューを予約して」',
  },
  {
    title: 'メッセージ',
    body:
      '「リリースノートを #ship チャンネルに送って」「佐藤さんに資料のリマインドを」',
  },
  {
    title: 'ドキュメント',
    body:
      '「Q2計画という設計ドキュメントを作成して、この箇条書きを貼り付けて」',
  },
  {
    title: 'Base（Bitable）',
    body:
      '「Issues Baseにバグ行を追加して」「今週作成されたP0の行を全部見せて」',
  },
  {
    title: 'Bot運用',
    body:
      '「このグループにLark Master Botを招待して」「プロジェクト空間に管理者読み取り権限を付与して」',
  },
  {
    title: 'ドライブ / Wiki',
    body:
      '「共有フォルダのファイル一覧を見せて」「EngineeringのRFC下にWikiノードを作って」',
  },
];

const wrap: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '48px 24px 96px',
};
const hero: React.CSSProperties = { marginBottom: 64 };
const eyebrow: React.CSSProperties = {
  letterSpacing: 3,
  fontSize: 12,
  color: '#d97757',
  fontWeight: 600,
};
const h1: React.CSSProperties = {
  fontSize: 48,
  lineHeight: 1.15,
  margin: '12px 0 24px',
  fontWeight: 700,
  letterSpacing: -1.2,
};
const h2: React.CSSProperties = { fontSize: 28, margin: '0 0 20px', fontWeight: 700 };
const h3: React.CSSProperties = { fontSize: 24, margin: '0 0 16px', fontWeight: 700, textAlign: 'center' as const };
const lead: React.CSSProperties = {
  fontSize: 19,
  lineHeight: 1.7,
  color: '#3d3d3d',
  maxWidth: 680,
};
const ctaRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 32,
  flexWrap: 'wrap',
};
const primaryCta: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  background: '#1a1a1a',
  color: '#faf9f5',
  borderRadius: 10,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 16,
};
const secondaryCta: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  background: 'transparent',
  color: '#1a1a1a',
  borderRadius: 10,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 16,
  border: '1.5px solid #1a1a1a',
};
const fineprint: React.CSSProperties = {
  marginTop: 24,
  color: '#6a6a6a',
  fontSize: 14,
};
const section: React.CSSProperties = { marginBottom: 64 };
const benefitsSection: React.CSSProperties = {
  marginBottom: 64,
  padding: '32px 0',
  background: '#faf9f5',
  marginLeft: -24,
  marginRight: -24,
  paddingLeft: 24,
  paddingRight: 24,
};
const steps: React.CSSProperties = {
  lineHeight: 1.9,
  fontSize: 17,
  color: '#3d3d3d',
  paddingLeft: 20,
};
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
};
const comparisonGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 24,
  maxWidth: 800,
  margin: '0 auto',
};
const comparisonCard: React.CSSProperties = {
  background: '#fff',
  border: '2px solid #e8e6dc',
  borderRadius: 12,
  padding: 24,
};
const cardBadge = (type: 'old' | 'new'): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 16,
  background: type === 'new' ? '#d4edda' : '#f8d7da',
  color: type === 'new' ? '#155724' : '#721c24',
});
const stepsList: React.CSSProperties = {
  paddingLeft: 20,
  margin: 0,
  lineHeight: 2,
  fontSize: 15,
  color: '#3d3d3d',
};
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e6dc',
  borderRadius: 12,
  padding: 20,
};
const cardTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  marginBottom: 8,
};
const cardBody: React.CSSProperties = {
  fontSize: 14,
  color: '#6a6a6a',
  lineHeight: 1.7,
};
const footer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: '1px solid #e8e6dc',
  paddingTop: 24,
  color: '#6a6a6a',
  fontSize: 13,
};
