import * as React from 'react';

import { cn } from '@/lib/utils';

function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
