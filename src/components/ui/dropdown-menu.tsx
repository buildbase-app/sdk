'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon, DotFilledIcon } from '@radix-ui/react-icons';

import { cn } from '../../lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent data-[state=open]:saas-os-bg-accent',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="saas-os-ml-auto saas-os-h-4 saas-os-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-lg data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-md',
        'data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-outline-none saas-os-transition-colors focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none saas-os-transition-colors focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon className="saas-os-h-4 saas-os-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none saas-os-transition-colors focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <DotFilledIcon className="saas-os-h-4 saas-os-w-4 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-saas-ossaas-os--mx-1 saas-os-my-1 saas-os-h-px saas-os-bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn('saas-os-ml-auto saas-os-text-xs saas-os-tracking-widest opacity-60', className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
