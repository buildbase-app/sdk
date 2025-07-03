import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, VariantProps } from 'class-variance-authority';
import { Loader2, LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full  font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      withIcon: {
        true: 'flex',
      },
      fullWidth: {
        true: 'w-full',
      },
      size: {
        default: 'h-9 py-2 px-4 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    compoundVariants: [
      {
        size: 'lg',
        withIcon: true,
        className: 'gap-x-1.5',
      },
      {
        size: 'default',
        withIcon: true,
        className: 'gap-x-1',
      },
      {
        size: 'sm',
        withIcon: true,
        className: 'gap-x-0.5',
      },
    ],
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
  startIcon?: React.ReactElement<LucideIcon>;
  endIcon?: React.ReactElement<LucideIcon>;
  fullWidth?: boolean;
  progress?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, progress, size, startIcon, endIcon, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const iconSize = getIconSize(size);
    return (
      <Comp
        disabled={progress || props.disabled}
        className={cn(
          buttonVariants({
            variant,
            size,
            withIcon: progress != null || startIcon != null || endIcon != null,
            className,
          })
        )}
        ref={ref}
        {...props}
      >
        {progress && <Loader2 size={iconSize} className="animate-spin" />}
        {startIcon &&
          React.cloneElement(startIcon, {
            size: iconSize,
          } as React.ComponentProps<LucideIcon>)}
        {props.children}
        {endIcon &&
          React.cloneElement(endIcon, {
            size: iconSize,
          } as React.ComponentProps<LucideIcon>)}
      </Comp>
    );
  }
);

function getIconSize(size: ButtonProps['size']) {
  switch (size) {
    case 'lg':
      return 20;
    case 'sm':
      return 14;
    default:
      return 16;
  }
}
Button.displayName = 'Button';

export { Button, buttonVariants };
