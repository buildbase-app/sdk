import * as React from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn('saas-os-relative z-10 saas-os-flex max-saas-os-w-max saas-os-flex-1 saas-os-items-center saas-os-justify-center', className)}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn('group saas-os-flex saas-os-flex-1 list-none saas-os-items-center saas-os-justify-center space-x-1', className)}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  'group saas-os-inline-saas-os-flex saas-os-h-9 saas-os-w-max saas-os-items-center saas-os-justify-center saas-os-rounded-md saas-os-bg-background saas-os-px-4 saas-os-py-2 saas-os-text-sm saas-os-font-medium saas-os-transition-colors hover:saas-os-bg-accent hover:saas-os-text-accent-foreground focus:saas-os-bg-accent focus:saas-os-text-accent-foreground focus:saas-os-outline-none disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50 data-[active]:saas-os-bg-accent/50 data-[state=open]:saas-os-bg-accent/50'
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), 'group', className)}
    {...props}
  >
    {children}{' '}
    <ChevronDownIcon
      className="saas-os-relative top-[1px] ml-1 saas-os-h-3 saas-os-w-3 transition duration-300 group-data-[state=open]:saas-os-rotate-180"
      aria-saas-os-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      'left-0 tosaas-os-p-0 saas-os-w-full data-[motion^=from-]:saas-os-animate-in data-[motion^=to-]:saas-os-animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:saas-os-absolute md:saas-os-w-auto ',
      className
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn('saas-os-absolute left-0 top-full saas-os-flex saas-os-justify-center')}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        'origin-top-center saas-os-relative saas-os-mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] saas-os-w-full overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-bg-popover saas-os-text-popover-foreground saas-os-shadow data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[state=closed]:saas-os-zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]',
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      'top-full z-[1] saas-os-flex saas-os-h-1.5 saas-os-items-end saas-os-justify-center overflow-saas-os-hidden data-[state=visible]:saas-os-animate-in data-[state=saas-os-hidden]:saas-os-animate-out data-[state=saas-os-hidden]:fade-out data-[state=visible]:fade-in',
      className
    )}
    {...props}
  >
    <div className="saas-os-relative top-[60%] saas-os-h-2 saas-os-w-2 rotate-45 saas-os-rounded-tl-sm saas-os-bg-saas-os-border saas-os-shadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
