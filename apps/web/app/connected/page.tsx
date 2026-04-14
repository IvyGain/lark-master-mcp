export default function ConnectedPage() {
  return (
    <main style={wrap}>
      <div style={eyebrow}>LARK MASTER</div>
      <h1 style={h1}>接続が完了しました</h1>
      <p style={lead}>
        認証完了。Lark アプリに戻ると「接続完了」カードが Bot から届いています。
        このタブは閉じていただいて構いません。
      </p>

      <div style={card} aria-labelledby="try-title">
        <div id="try-title" style={cardTitle}>まず試してみる</div>
        <ul style={cardList}>
          <li>「今日の予定を教えて」</li>
          <li>「『議事録』というドキュメントを作成して」</li>
          <li>「『デプロイ完了』を #ship チャンネルに送って」</li>
        </ul>
      </div>

      <p style={fineprint}>
        Bot は既にあなたのワークスペースに参加しています。Lark の任意のチャットからメッセージを送れば応答します。
      </p>
    </main>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 640,
  margin: '12vh auto 0',
  padding: '0 24px 96px',
};
const eyebrow: React.CSSProperties = {
  letterSpacing: 3,
  fontSize: 12,
  color: '#d97757',
  fontWeight: 600,
  marginBottom: 12,
};
const h1: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  margin: '0 0 16px',
  letterSpacing: -1,
  lineHeight: 1.2,
};
const lead: React.CSSProperties = {
  fontSize: 18,
  lineHeight: 1.75,
  color: '#3d3d3d',
  marginBottom: 32,
};
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e8e6dc',
  borderRadius: 12,
  padding: 24,
};
const cardTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 12,
};
const cardList: React.CSSProperties = {
  lineHeight: 2,
  color: '#3d3d3d',
  paddingLeft: 20,
  margin: 0,
  fontSize: 15,
};
const fineprint: React.CSSProperties = {
  marginTop: 28,
  color: '#6a6a6a',
  fontSize: 14,
  lineHeight: 1.7,
};
