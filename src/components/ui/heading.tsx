import { cva, VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const headingVariants = cva(
  'inline-flex items-center justify-center rounded-full  font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        h1: 'text-4xl font-extrabold tracking-tight lg:text-5xl',
        h2: 'text-3xl font-extrabold tracking-tight lg:text-4xl',
        h3: 'text-2xl font-extrabold tracking-tight lg:text-3xl',
        h4: 'text-xl font-extrabold tracking-tight lg:text-2xl',
        h5: 'text-lg font-bold tracking-tight lg:text-xl',
        h6: 'text-base font-bold tracking-tight lg:text-lg',
      },
      padding: {
        none: 'py-0',
        default: 'py-2',
        sm: 'py-1',
        lg: 'py-3',
      },
    },
    defaultVariants: {
      variant: 'h3',
      padding: 'default',
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(({ variant, ...props }, ref) => {
  const Component = variant as keyof React.JSX.IntrinsicElements;
  return React.createElement(Component as string, {
    className: cn(
      headingVariants({
        variant,
      })
    ),
    ref,
    ...props,
  });
});

Heading.displayName = 'heading';

export { Heading, headingVariants };
