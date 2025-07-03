import * as React from 'react';

import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'saas-os-flex min-h-[60px] saas-os-w-full saas-os-rounded-md saas-os-border saas-os-border-input saas-os-bg-transparent saas-os-px-3 saas-os-py-2 saas-os-text-sm saas-os-shadow-sm placeholder:saas-os-text-muted-foreground focus-visible:saas-os-outline-none focus-visible:saas-os-ring-1 focus-visible:saas-os-ring-ring disabled:saas-os-cursor-not-allowed disabled:saas-os-opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
