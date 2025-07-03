'use client';

import * as React from 'react';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as SelectPrimitive from '@radix-ui/react-select';

import { cn } from '../../lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'saas-os-flex saas-os-h-9 saas-os-w-full saas-os-items-center saas-os-justify-between saas-os-rounded-md saas-os-border saas-os-border-input saas-os-bg-transparent saas-os-px-3 saas-os-py-2 saas-os-text-sm saas-os-shadow-sm saas-os-ring-offset-background placeholder:saas-os-text-muted-foreground focus:saas-os-outline-none focus:saas-os-ring-1 focus:saas-os-ring-ring disabled:saas-os-cursor-not-allowed disabled:saas-os-opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <CaretSortIcon className="saas-os-h-4 saas-os-w-4 saas-os-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'saas-os-relative saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-text-popover-foreground saas-os-shadow-md data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'saas-os-p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] saas-os-w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-w-full saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-2 pr-8 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    {...props}
  >
    <span className="saas-os-absolute right-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="saas-os-h-4 saas-os-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-saas-ossaas-os--mx-1 saas-os-my-1 saas-os-h-px saas-os-bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
