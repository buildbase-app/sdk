import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'saas-os-inline-flex saas-os-items-center saas-os-justify-center saas-os-whitespace-nowrap saas-os-rounded-md saas-os-text-sm saas-os-font-medium saas-os-ring-offset-background saas-os-transition-colors focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2 disabled:saas-os-pointer-events-none disabled:saas-os-opacity-50',
  {
    variants: {
      variant: {
        default: 'saas-os-bg-primary saas-os-text-primary-foreground hover:saas-os-bg-primary/90',
        destructive:
          'saas-os-bg-destructive saas-os-text-destructive-foreground hover:saas-os-bg-destructive/90',
        outline:
          'saas-os-border saas-os-border-input saas-os-bg-background hover:saas-os-bg-accent hover:saas-os-text-accent-foreground',
        secondary:
          'saas-os-bg-secondary saas-os-text-secondary-foreground hover:saas-os-bg-secondary/80',
        ghost: 'hover:saas-os-bg-accent hover:saas-os-text-accent-foreground',
        link: 'saas-os-text-primary saas-os-underline-offset-4 hover:saas-os-underline',
      },
      size: {
        default: 'saas-os-h-10 saas-os-px-4 saas-os-py-2',
        sm: 'saas-os-h-9 saas-os-rounded-md saas-os-px-3',
        lg: 'saas-os-h-11 saas-os-rounded-md saas-os-px-8',
        icon: 'saas-os-h-10 saas-os-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants }; 