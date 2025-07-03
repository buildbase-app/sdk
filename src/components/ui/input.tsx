import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'saas-os-flex saas-os-h-10 saas-os-w-full saas-os-rounded-md saas-os-border saas-os-border-input saas-os-bg-background saas-os-px-3 saas-os-py-2 saas-os-text-sm saas-os-ring-offset-background file:saas-os-border-0 file:saas-os-bg-transparent file:saas-os-text-sm file:saas-os-font-medium placeholder:saas-os-text-muted-foreground focus-visible:saas-os-outline-none focus-visible:saas-os-ring-2 focus-visible:saas-os-ring-ring focus-visible:saas-os-ring-offset-2 disabled:saas-os-cursor-not-allowed disabled:saas-os-opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input }; 