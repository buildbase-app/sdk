'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'saas-os-inline-saas-os-flex saas-os-h-9 saas-os-items-center saas-os-justify-center saas-os-rounded-lg saas-os-bg-muted saas-os-p-1 saas-os-text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'saas-os-inline-saas-os-flex saas-os-items-center saas-os-justify-center whitespace-nowrap saas-os-rounded-md saas-os-px-3 saas-os-py-1 saas-os-text-sm saas-os-font-medium saas-os-ring-offset-background saas-os-transition-all focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2 disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50 data-[state=active]:saas-os-bg-background data-[state=active]:saas-os-text-foreground data-[state=active]:saas-os-shadow',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'saas-os-mt-2 saas-os-ring-offset-background focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
