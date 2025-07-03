'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '../../lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('saas-os-relative saas-os-h-2 saas-os-w-full overflow-saas-os-hidden saas-os-rounded-full saas-os-bg-primary/20', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="saas-os-h-full saas-os-w-full saas-os-flex-1 saas-os-bg-primary saas-os-transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
