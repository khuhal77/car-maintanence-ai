import * as React from 'react';

import { cn } from '@/lib/utils';

interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number;
}

function AspectRatio({ className, ratio = 16 / 10, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: String(ratio) }}
      {...props}
    />
  );
}

export { AspectRatio };
