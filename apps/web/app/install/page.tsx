const APP_ID = process.env.NEXT_PUBLIC_LARK_APP_ID ?? 'cli_xxxxxxxxxxxxxxxx';
const DOMAIN = process.env.NEXT_PUBLIC_LARK_DOMAIN ?? 'https://open.larksuite.com';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_LARK_REDIRECT_URI ??
  'https://lark-master.example.com/lark/oauth/callback';
const DEFAULT_SCOPES =
  'im:message calendar:calendar calendar:calendar_event docx:document bitable:app bitable:record drive:drive contact:user.id:readonly contact:user.base:readonly';

export default function InstallPage() {
  const authorizeUrl =
    `${DOMAIN}/open-apis/authen/v1/index?` +
    new URLSearchParams({
      app_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      scope: DEFAULT_SCOPES,
      state: 'install',
    }).toString();

  return (
    <main style={wrap}>
      <header style={{ marginBottom: 48 }}>
        <div style={eyebrow}>INSTALL GUIDE</div>
        <h1 style={h1}>インストール手順</h1>
        <p style={lead}>
          4ステップで Lark Master Bot をワークスペースに追加できます。所要時間はおよそ1分です。
        </p>
        <div style={{ marginTop: 24 }}>
          <a
            href={authorizeUrl}
            style={primaryCta}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to Lark →
          </a>
        </div>
      </header>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" style={srOnly}>手順</h2>
        <ol style={stepList}>
          {STEPS.map((s) => (
            <li key={s.n} style={stepItem}>
              <div style={stepNumber} aria-hidden="true">{s.n}</div>
              <div style={stepBody}>
                <div style={stepTitle}>{s.title}</div>
                <p style={stepDesc}>{s.desc}</p>
                <div style={tipBox}>
                  <span style={tipLabel}>Tip</span>
                  <span style={tipText}>{s.tip}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ marginTop: 64 }} aria-labelledby="trouble-title">
        <h2 id="trouble-title" style={h2}>困ったら</h2>
        <div style={grid}>
          {TROUBLES.map((t) => (
            <div key={t.title} style={card}>
              <div style={cardTitle}>{t.title}</div>
              <div style={cardBody}>{t.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <a
          href={authorizeUrl}
          style={primaryCta}
          target="_blank"
          rel="noopener noreferrer"
        >
          Add to Lark →
        </a>
        <p style={fineprint}>
          権限確認は1回だけです。あとは Lark のチャットから Bot に話しかけるだけで動きます。
        </p>
      </div>

      <footer style={footer}>
        <a href="/" style={{ color: '#6a6a6a', textDecoration: 'none' }}>
          ← トップに戻る
        </a>
      </footer>
    </main>
  );
}

const STEPS = [
  {
    n: 1,
    title: '「Add to Lark」ボタンをクリック',
    desc:
      'このページ上部または下部にあるボタンを押してください。ブラウザの新しいタブで Lark の認可ページが開きます。',
    tip: 'ポップアップがブロックされる場合は、右クリックで「新しいタブで開く」を選択してください。',
  },
  {
    n: 2,
    title: 'Lark アプリで Bot をワークスペースに追加',
    desc:
      'Lark デスクトップアプリまたはモバイルアプリが開き、Bot をワークスペースへインストールする画面が表示されます。追加先のワークスペースを選んで「追加」を押してください。',
    tip: '複数のワークスペースに所属している場合は、追加先を間違えないようにご確認ください。',
  },
  {
    n: 3,
    title: 'Bot から自動でウェルカムカードが届く',
    desc:
      'インストール直後、Lark Master Bot から DM でウェルカムカードが送られてきます。Bot との会話画面を開いてカードを確認してください。',
    tip: 'カードが見当たらないときは、Lark 左上の検索から「Lark Master」を探して DM を開いてみてください。',
  },
  {
    n: 4,
    title: 'カードの「権限を許可する」ボタンから OAuth 同意画面へ',
    desc:
      'ウェルカムカードの「権限を許可する」ボタンを押すとブラウザが開き、OAuth 同意画面が表示されます。スコープを確認して「許可」を押すと接続完了です。',
    tip: '許可後に表示される「接続が完了しました」ページは閉じて、Lark に戻って Bot に話しかけてください。',
  },
];

const TROUBLES = [
  {
    title: 'ブラウザが開かない',
    body:
      'ポップアップブロッカーが原因のことが多いです。ボタンを右クリックして「新しいタブで開く」を選ぶか、ブラウザ設定でこのサイトのポップアップを許可してください。',
  },
  {
    title: 'ウェルカムカードが来ない',
    body:
      'インストール直後は数秒〜十数秒かかることがあります。1分以上待っても届かない場合は、Lark の検索から Bot を探し、DM を開いてリロードしてみてください。',
  },
  {
    title: '権限を間違えた',
    body:
      'Lark のプロフィール設定 → 接続済みアプリから Lark Master を一度削除し、このページの「Add to Lark」ボタンからやり直してください。',
  },
];

const wrap: React.CSSProperties = {
  maxWidth: 820,
  margin: '0 auto',
  padding: '48px 24px 96px',
};
const eyebrow: React.CSSProperties = {
  letterSpacing: 3,
  fontSize: 12,
  color: '#d97757',
  fontWeight: 600,
};
const h1: React.CSSProperties = {
  fontSize: 44,
  lineHeight: 1.15,
  margin: '12px 0 16px',
  fontWeight: 700,
  letterSpacing: -1.2,
};
const h2: React.CSSProperties = { fontSize: 26, margin: '0 0 20px', fontWeight: 700 };
const lead: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.7,
  color: '#3d3d3d',
  maxWidth: 640,
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
const stepList: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};
const stepItem: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  background: '#fff',
  border: '1px solid #e8e6dc',
  borderRadius: 14,
  padding: 24,
  alignItems: 'flex-start',
};
const stepNumber: React.CSSProperties = {
  flex: '0 0 auto',
  width: 44,
  height: 44,
  borderRadius: 999,
  background: '#1a1a1a',
  color: '#faf9f5',
  fontWeight: 700,
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const stepBody: React.CSSProperties = { flex: 1, minWidth: 0 };
const stepTitle: React.CSSProperties = {
  fontSize: 19,
  fontWeight: 700,
  marginBottom: 8,
  lineHeight: 1.4,
};
const stepDesc: React.CSSProperties = {
  fontSize: 15,
  color: '#3d3d3d',
  lineHeight: 1.75,
  margin: '0 0 14px',
};
const tipBox: React.CSSProperties = {
  background: '#faf9f5',
  border: '1px solid #e8e6dc',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  color: '#6a6a6a',
  lineHeight: 1.6,
};
const tipLabel: React.CSSProperties = {
  display: 'inline-block',
  fontWeight: 700,
  color: '#d97757',
  marginRight: 8,
  letterSpacing: 1,
};
const tipText: React.CSSProperties = {};
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e6dc',
  borderRadius: 12,
  padding: 20,
};
const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 8,
};
const cardBody: React.CSSProperties = {
  fontSize: 14,
  color: '#6a6a6a',
  lineHeight: 1.75,
};
const fineprint: React.CSSProperties = {
  marginTop: 16,
  color: '#6a6a6a',
  fontSize: 13,
};
const footer: React.CSSProperties = {
  marginTop: 64,
  borderTop: '1px solid #e8e6dc',
  paddingTop: 24,
  fontSize: 13,
};
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  border: 0,
};
