import * as React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  /** Icon shown above the text, e.g. `<KeyRound className="h-5 w-5 text-muted-foreground" />` */
  icon?: React.ReactNode;
  /** Short headline. Optional — many empty states only need a description. */
  title?: string;
  /** Muted explanatory text. */
  description?: string;
  /** Optional call-to-action rendered under the text (e.g. a Button). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard empty-list placeholder: dashed border card with a centered icon,
 * muted text and an optional action. Use for every "nothing here yet" state
 * so all screens share the same look.
 */
function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center',
        className
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {title && <p className="text-sm font-medium">{title}</p>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export { EmptyState };
