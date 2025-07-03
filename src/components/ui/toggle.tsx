'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const toggleVariants = cva(
  'saas-os-inline-saas-os-flex saas-os-items-center saas-os-justify-center saas-os-rounded-md saas-os-text-sm saas-os-font-medium saas-os-transition-colors hover:saas-os-bg-muted hover:saas-os-text-muted-foreground focus-visible:saas-os-outline-none focus-visible:saas-os-ring-1 focus-visible:saas-os-ring-ring disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50 data-[state=on]:saas-os-bg-accent data-[state=on]:saas-os-text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'saas-os-bg-transparent',
        outline:
          'saas-os-border saas-os-border-input saas-os-bg-transparent saas-os-shadow-sm hover:saas-os-bg-accent hover:saas-os-text-accent-foreground',
      },
      size: {
        default: 'saas-os-h-9 saas-os-px-3',
        sm: 'saas-os-h-8 saas-os-px-2',
        lg: 'saas-os-h-10 saas-os-px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
