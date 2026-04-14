export default function ConnectedPage() {
  return (
    <main style={{ maxWidth: 560, margin: '14vh auto', padding: '0 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>
        Lark Master is connected
      </h1>
      <p style={{ fontSize: 18, lineHeight: 1.6, color: '#3d3d3d' }}>
        You can close this tab and go back to Lark. Send a message to the{' '}
        <strong>Lark Master</strong> bot in any chat and it will answer.
      </p>
      <div
        style={{
          marginTop: 32,
          background: '#fff',
          border: '1px solid #e8e6dc',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Try it</div>
        <ul style={{ lineHeight: 1.8, color: '#3d3d3d', paddingLeft: 20, margin: 0 }}>
          <li>"What's on my calendar today?"</li>
          <li>"Create a doc called Meeting Notes."</li>
          <li>"Send 'Deploy done' to the #ship channel."</li>
        </ul>
      </div>
    </main>
  );
}
