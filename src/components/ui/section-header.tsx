import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps {
  /** Section title. Pass null to hide (e.g. when a parent already renders it). */
  title?: string | null;
  /** Muted description under the title. */
  description?: string | null;
  /** Optional element aligned to the end of the title row (e.g. a badge or button). */
  actions?: React.ReactNode;
  className?: string;
  /** Extra classes for the title, e.g. `text-destructive` for danger sections. */
  titleClassName?: string;
}

/**
 * Standard section heading used across settings screens:
 * `h3 text-sm font-medium` title + muted `text-sm` description.
 * Renders nothing when both title and description are empty.
 */
function SectionHeader({
  title,
  description,
  actions,
  className,
  titleClassName,
}: SectionHeaderProps) {
  if (!title && !description && !actions) {
    return null;
  }
  return (
    <div className={cn(className)}>
      {(title || actions) && (
        <div className={cn('flex items-center gap-2', title ? 'justify-between' : 'justify-end')}>
          {title && <h3 className={cn('text-sm font-medium', titleClassName)}>{title}</h3>}
          {actions}
        </div>
      )}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export { SectionHeader };
