import * as React from 'react';

import { cn } from '@/lib/utils';

function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="separator"
      className={cn('shrink-0 bg-border', className)}
      {...props}
    />
  );
}

export { Separator };
