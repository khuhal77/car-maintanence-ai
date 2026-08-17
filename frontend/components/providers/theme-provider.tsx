'use client';

import type { ReactNode } from 'react';

type ThemeProviderProps = {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  forcedTheme?: string;
  value?: Record<string, string>;
};

let NextThemesProvider: React.ComponentType<ThemeProviderProps> = ({ children }) => <>{children}</>;

try {
  const themes = require('next-themes');
  NextThemesProvider = themes.ThemeProvider as React.ComponentType<ThemeProviderProps>;
} catch {
  // Fallback when the package is not installed in this environment.
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
