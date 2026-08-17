import type { Metadata } from 'next';
// import { Geist } from 'next/font/google';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ApiProvider } from '@/contexts/ApiContext';
import { cn } from '@/lib/utils';
import './globals.css';

// const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" suppressHydrationWarning className={cn('font-sans',)}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ApiProvider>
            {children}
            <Toaster />
          </ApiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
