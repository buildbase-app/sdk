'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '../../lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'saas-os-z-50 overflow-saas-os-hidden saas-os-rounded-md saas-os-bg-primary saas-os-px-3 saas-os-py-1.5 saas-os-text-xs saas-os-text-primary-foreground saas-os-animate-in saas-os-fade-in-0 saas-os-zoom-in-95 data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=closed]:saas-os-zoom-out-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
