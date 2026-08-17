import * as React from 'react';

import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variant === 'destructive'
          ? 'border-[color:var(--status-high)] bg-[color:var(--status-high-dim)] text-[color:var(--status-high)]'
          : 'border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
