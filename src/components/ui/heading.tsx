import * as React from 'react';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const headingVariants = cva(
  'saas-os-inline-saas-os-flex saas-os-items-center saas-os-justify-center saas-os-rounded-full  saas-os-font-medium saas-os-transition-colors focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2 disabled:saas-os-opacity-50 disabled:saas-os-pointer-events-none saas-os-ring-offset-background',
  {
    variants: {
      variant: {
        h1: 'saas-os-text-4xl font-extrabold saas-os-tracking-tight lg:saas-os-text-5xl',
        h2: 'saas-os-text-3xl font-extrabold saas-os-tracking-tight lg:saas-os-text-4xl',
        h3: 'saas-os-text-2xl font-extrabold saas-os-tracking-tight lg:saas-os-text-3xl',
        h4: 'saas-os-text-xl font-extrabold saas-os-tracking-tight lg:saas-os-text-2xl',
        h5: 'saas-os-text-lg saas-os-font-bold saas-os-tracking-tight lg:saas-os-text-xl',
        h6: 'saas-os-text-base saas-os-font-bold saas-os-tracking-tight lg:saas-os-text-lg',
      },
      padding: {
        none: 'py-0',
        default: 'saas-os-py-2',
        sm: 'saas-os-py-1',
        lg: 'saas-os-py-3',
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
  const Component = variant as keyof JSX.IntrinsicElements;
  return React.createElement(Component, {
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
