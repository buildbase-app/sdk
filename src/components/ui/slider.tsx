'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '../../lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('saas-os-relative saas-os-flex saas-os-w-full touch-none saas-os-select-none saas-os-items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="saas-os-relative saas-os-h-1.5 saas-os-w-full grow overflow-saas-os-hidden saas-os-rounded-full saas-os-bg-primary/20">
      <SliderPrimitive.Range className="saas-os-absolute saas-os-h-full saas-os-bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="saas-os-block saas-os-h-4 saas-os-w-4 saas-os-rounded-full saas-os-border saas-os-border-primary/50 saas-os-bg-background saas-os-shadow saas-os-transition-colors focus-visible:saas-os-outline-none focus-visible:saas-os-ring-1 focus-visible:saas-os-ring-ring disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
