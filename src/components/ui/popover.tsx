'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '../../lib/utils';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'saas-os-z-50 saas-os-w-72 saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-4 saas-os-text-popover-foreground saas-os-shadow-md saas-os-outline-none data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
