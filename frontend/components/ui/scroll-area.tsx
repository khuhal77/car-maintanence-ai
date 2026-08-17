import * as React from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      <div className="h-full w-full overflow-y-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-track]:bg-transparent">
        {children}
      </div>
    </div>
  );
}

export { ScrollArea };
