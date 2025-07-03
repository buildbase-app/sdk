'use client';

import * as React from 'react';
import { CheckIcon, ChevronRightIcon, DotFilledIcon } from '@radix-ui/react-icons';
import * as MenubarPrimitive from '@radix-ui/react-menubar';

import { cn } from '../../lib/utils';

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      'saas-os-flex saas-os-h-9 saas-os-items-center space-x-1 saas-os-rounded-md saas-os-border saas-os-bg-background saas-os-p-1 saas-os-shadow-sm',
      className
    )}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      'saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-3 saas-os-py-1 saas-os-text-sm saas-os-font-medium saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[state=open]:saas-os-bg-accent data-[state=open]:saas-os-text-accent-foreground',
      className
    )}
    {...props}
  />
));
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
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
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      'saas-os-z-50 min-w-[8rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-lg data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
      className
    )}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(({ className, align = 'start', alignOffset = -4, sideOffset = 8, ...props }, ref) => (
  <MenubarPrimitive.Portal>
    <MenubarPrimitive.Content
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        'saas-os-z-50 min-w-[12rem] overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-p-1 saas-os-text-popover-foreground saas-os-shadow-md data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-fade-out-0 data-[state=open]:saas-os-fade-in-0 data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:saas-os-zoom-in-95 data-[side=bottom]:slide-in-from-tosaas-os-p-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottosaas-os-m-2',
        className
      )}
      {...props}
    />
  </MenubarPrimitive.Portal>
));
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <MenubarPrimitive.ItemIndicator>
        <CheckIcon className="saas-os-h-4 saas-os-w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      'saas-os-relative saas-os-flex saas-os-cursor-default saas-os-select-none saas-os-items-center saas-os-rounded-sm saas-os-py-1.5 pl-8 pr-2 saas-os-text-sm saas-os-outline-none focus:saas-os-bg-accent focus:saas-os-text-accent-foreground data-[disabled]:saas-os-pointer-events-none data-[disabled]:saas-os-opacity-50',
      className
    )}
    {...props}
  >
    <span className="saas-os-absolute left-2 saas-os-flex saas-os-h-3.5 saas-os-w-3.5 saas-os-items-center saas-os-justify-center">
      <MenubarPrimitive.ItemIndicator>
        <DotFilledIcon className="saas-os-h-4 saas-os-w-4 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn('saas-os-px-2 saas-os-py-1.5 saas-os-text-sm saas-os-font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn('-saas-ossaas-os--mx-1 saas-os-my-1 saas-os-h-px saas-os-bg-muted', className)}
    {...props}
  />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('saas-os-ml-auto saas-os-text-xs saas-os-tracking-widest saas-os-text-muted-foreground', className)}
      {...props}
    />
  );
};
MenubarShortcut.displayname = 'MenubarShortcut';

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
