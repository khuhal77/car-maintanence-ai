import type { Metadata } from 'next';
import { ApiProvider } from '@/contexts/ApiContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Car Maintenance AI',
  description: 'AI-powered car maintenance diagnostics and price comparison',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>{children}</ApiProvider>
      </body>
    </html>
  );
}
