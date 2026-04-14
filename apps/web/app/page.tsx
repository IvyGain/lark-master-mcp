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
      <section style={hero}>
        <div style={eyebrow}>LARK MASTER</div>
        <h1 style={h1}>
          One bot. Every Lark surface.
          <br />
          Driven by Claude.
        </h1>
        <p style={lead}>
          Drop a natural-language request into the Lark Bot and it fans out to calendar,
          docs, Base, drive, mail, and tasks — automatically. Works from your phone, your
          desktop, or your voice agent.
        </p>

        <div style={ctaRow}>
          <a href={authorizeUrl} style={primaryCta}>
            Add to Lark →
          </a>
          <a href="#how" style={secondaryCta}>
            How it works
          </a>
        </div>

        <p style={fineprint}>
          Powered by <code>@larksuite/cli</code> and the Claude Agent SDK. No developer
          console trips after install.
        </p>
      </section>

      <section id="how" style={section}>
        <h2 style={h2}>How it works</h2>
        <ol style={steps}>
          <li>
            <strong>Add to Lark</strong> — click the button above. Lark prompts you for
            permissions once; you approve and you are done.
          </li>
          <li>
            <strong>Chat with the bot</strong> — in any Lark chat or DM, tell the bot what
            you want. Example: <em>"book a 30 min review with Sato tomorrow 2pm"</em>.
          </li>
          <li>
            <strong>Brain plans &amp; executes</strong> — Claude decomposes the request
            into <code>lark-cli</code> calls, confirms destructive actions via an
            interactive card, and replies with the result.
          </li>
          <li>
            <strong>Use from anywhere</strong> — the same bot works from your phone when
            your PC is off. It also ships as a stdio MCP server so voiceOS and Claude
            Desktop can drive Lark directly.
          </li>
        </ol>
      </section>

      <section style={section}>
        <h2 style={h2}>What you can do</h2>
        <div style={grid}>
          {CAPABILITIES.map((c) => (
            <div key={c.title} style={card}>
              <div style={cardTitle}>{c.title}</div>
              <div style={cardBody}>{c.body}</div>
            </div>
          ))}
        </div>
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
    title: '📅 Calendar',
    body:
      '"What is on my schedule today?" "Move my 3pm to Thursday." "Book a 30 min review."',
  },
  {
    title: '💬 Messaging',
    body:
      '"Send the release notes to the #ship channel." "Remind @sato about the deck."',
  },
  {
    title: '📄 Docs',
    body: '"Create a design doc titled Q2 Planning and paste these bullet points."',
  },
  {
    title: '📊 Base (Bitable)',
    body:
      '"Add a bug row to the Issues base." "Show me all P0 rows opened this week."',
  },
  {
    title: '🤖 Bot management',
    body:
      '"Invite the Lark Master bot to this group." "Grant admin read on the project space."',
  },
  {
    title: '🗂 Drive / Wiki',
    body:
      '"List files in the Shared folder." "Create a wiki node under Engineering for the RFC."',
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
  fontSize: 52,
  lineHeight: 1.08,
  margin: '12px 0 24px',
  fontWeight: 700,
  letterSpacing: -1.5,
};
const h2: React.CSSProperties = { fontSize: 28, margin: '0 0 20px', fontWeight: 700 };
const lead: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.55,
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
  lineHeight: 1.8,
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
  lineHeight: 1.6,
};
const footer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  borderTop: '1px solid #e8e6dc',
  paddingTop: 24,
  color: '#6a6a6a',
  fontSize: 13,
};
