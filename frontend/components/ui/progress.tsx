import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
  indicatorStyle?: React.CSSProperties;
}

function Progress({ className, value = 0, indicatorClassName, indicatorStyle, ...props }: ProgressProps) {
  return (
    <div
      data-slot="progress"
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 rounded-full transition-all', indicatorClassName)}
        style={{
          width: `${value}%`,
          ...indicatorStyle,
        }}
      />
    </div>
  );
}

export { Progress };
