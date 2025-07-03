'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '../../lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer saas-os-inline-saas-os-flex h-[20px] w-[36px] saas-os-shrink-0 saas-os-cursor-pointer saas-os-items-center saas-os-rounded-full saas-os-border-2 saas-os-border-transparent saas-os-shadow-sm saas-os-transition-colors focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2 focus-visible:saas-os-ring-offset-background disabled:saas-os-cursor-not-allowed disabled:saas-os-opacity-50 data-[state=checked]:saas-os-bg-primary data-[state=unchecked]:saas-os-bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none saas-os-block saas-os-h-4 saas-os-w-4 saas-os-rounded-full saas-os-bg-background saas-os-shadow-lg ring-0 saas-os-transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
