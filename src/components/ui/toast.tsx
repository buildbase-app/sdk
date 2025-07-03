import * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'saas-os-fixed tosaas-os-p-0 z-[100] saas-os-flex max-saas-os-h-screen saas-os-w-full saas-os-flex-col-reverse saas-os-p-4 sm:bottosaas-os-m-0 sm:right-0 sm:top-auto sm:saas-os-flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto saas-os-relative saas-os-flex saas-os-w-full saas-os-items-center saas-os-justify-between saas-os-space-x-2 overflow-saas-os-hidden saas-os-rounded-md saas-os-border saas-os-p-4 pr-6 saas-os-shadow-lg saas-os-transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:saas-os-animate-in data-[state=closed]:saas-os-animate-out data-[swipe=end]:saas-os-animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'saas-os-border saas-os-bg-background saas-os-text-foreground',
        destructive:
          'destructive group saas-os-border-destructive saas-os-bg-destructive saas-os-text-destructive-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'saas-os-inline-saas-os-flex saas-os-h-8 saas-os-shrink-0 saas-os-items-center saas-os-justify-center saas-os-rounded-md saas-os-border saas-os-bg-transparent saas-os-px-3 saas-os-text-sm saas-os-font-medium saas-os-transition-colors hover:saas-os-bg-secondary focus:saas-os-outline-none focus:saas-os-ring-1 focus:saas-os-ring-ring disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50 group-[.destructive]:saas-os-border-muted/40 group-[.destructive]:hover:saas-os-border-destructive/30 group-[.destructive]:hover:saas-os-bg-destructive group-[.destructive]:hover:saas-os-text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'saas-os-absolute right-1 tosaas-os-p-1 saas-os-rounded-md saas-os-p-1 saas-os-text-foreground/50 opacity-0 saas-os-transition-opacity hover:saas-os-text-foreground focus:saas-os-opacity-100 focus:saas-os-outline-none focus:saas-os-ring-1 group-hover:saas-os-opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
      className
    )}
    toast-close=''
    {...props}
  >
    <Cross2Icon className='saas-os-h-4 saas-os-w-4' />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('saas-os-text-sm saas-os-font-semibold [&+div]:saas-os-text-xs', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('saas-os-text-sm opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction
}
