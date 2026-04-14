import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lark Master — AI assistant for your Lark workspace',
  description:
    'One Lark bot that reads your calendar, writes docs, manages Base, and sends messages — powered by Claude and lark-cli.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          background: '#faf9f5',
          color: '#1a1a1a',
          margin: 0,
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
