const APP_ID = process.env.NEXT_PUBLIC_LARK_APP_ID ?? 'cli_xxxxxxxxxxxxxxxx';
const DOMAIN = process.env.NEXT_PUBLIC_LARK_DOMAIN ?? 'https://open.larksuite.com';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_LARK_REDIRECT_URI ??
  'https://lark-master.example.com/lark/oauth/callback';
const DEFAULT_SCOPES =
  'im:message calendar:calendar calendar:calendar_event docx:document bitable:app bitable:record drive:drive contact:user.id:readonly contact:user.base:readonly';

export default function LandingPage() {
  const authorizeUrl =
    `${DOMAIN}/open-apis/authen/v1/index?` +
    new URLSearchParams({
      app_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      scope: DEFAULT_SCOPES,
      state: 'landing',
    }).toString();

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
          <a
            href={authorizeUrl}
            style={primaryCta}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to Lark →
          </a>
          <a href="/install" style={secondaryCta}>
            インストール手順を見る
          </a>
        </div>

        <p style={fineprint}>
          <code>@larksuite/cli</code> と Claude Agent SDK を基盤にしています。インストール後の開発者コンソール作業は不要です。
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
            <strong>Add to Lark を押す</strong> — 上のボタンからLarkに追加します。権限確認は1回だけで完了します。
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
