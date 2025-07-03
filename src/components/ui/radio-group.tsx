'use client';

import * as React from 'react';
import { CheckIcon } from '@radix-ui/react-icons';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '../../lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn('saas-os-grid gasaas-os-p-2', className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'saas-os-aspect-square saas-os-h-4 saas-os-w-4 saas-os-rounded-full saas-os-border saas-os-border-primary saas-os-text-primary saas-os-shadow focus:saas-os-outline-none focus-visible:saas-os-ring-1 focus-visible:saas-os-ring-ring disabled:saas-os-cursor-not-allowed disabled:saas-os-opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="saas-os-flex saas-os-items-center saas-os-justify-center">
        <CheckIcon className="saas-os-h-3.5 saas-os-w-3.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
