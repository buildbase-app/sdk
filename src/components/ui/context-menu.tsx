'use client';

import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { CheckIcon, ChevronRightIcon, DotFilledIcon } from '@radix-ui/react-icons';

import { cn } from '../../lib/utils';

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[state=open]:saas-os-bg-accent data-[state=open]:saas-os-text-accent-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="saas-os-ml-auto saas-os-h-4 saas-os-w-4" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-lg data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
      className
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        'saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-md data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <CheckIcon className="saas-os-h-4 saas-os-w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <DotFilledIcon className="saas-os-h-4 saas-os-w-4 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn('saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-font-semibold saas-os-text-foreground', inset && 'pl-8', className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn('-saas-ossaas-os--mx-1 saas-os-my-1 saas-os-h-px saas-os-bg-saas-os-border', className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('saas-os-ml-auto saas-os-text-xs saas-os-tracking-widest saas-os-text-muted-foreground', className)}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
