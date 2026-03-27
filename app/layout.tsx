import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LLM-powered content generation and management',
  description: 'Iterative prompt-based content generation and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
