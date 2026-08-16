import type { Metadata } from 'next';
import { ApiProvider } from '@/contexts/ApiContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'VEHIQ — Vehicle Part Diagnostics',
  description: 'Photo-based diagnostics for car and bike parts, with live retailer price comparison.',
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
