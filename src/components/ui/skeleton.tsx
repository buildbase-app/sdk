import * as React from 'react';
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse saas-os-rounded-md saas-os-bg-primary/10', className)} {...props} />;
}

export { Skeleton };
