import * as React from 'react';

import { cn } from '@/lib/utils';

interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  content: React.ReactNode;
}

function Tooltip({ content, children, className, ...props }: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <div className={cn('group relative inline-flex max-w-full', className)} {...props}>
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden -translate-x-1/2 whitespace-normal rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
        {content}
      </span>
    </div>
  );
}

export { Tooltip };
