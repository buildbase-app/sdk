import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export type StatusBannerVariant = 'error' | 'success' | 'warning' | 'info';

// Colors come from the theme tokens (--destructive/--success/--warning/--info)
// so SDK implementors can rebrand every banner by overriding the CSS variables.
const VARIANTS: Record<StatusBannerVariant, { box: string; sub: string; button: string }> = {
  error: {
    box: 'bg-destructive/10 border-destructive/20 text-destructive',
    sub: 'text-destructive/80',
    button: 'border-destructive/20 text-destructive hover:bg-destructive/10',
  },
  success: {
    box: 'bg-success/10 border-success/20 text-success',
    sub: 'text-success/80',
    button: 'border-success/20 text-success hover:bg-success/10',
  },
  warning: {
    box: 'bg-warning/10 border-warning/20 text-warning',
    sub: 'text-warning/80',
    button: 'border-warning/20 text-warning hover:bg-warning/10',
  },
  info: {
    box: 'bg-info/10 border-info/20 text-info',
    sub: 'text-info/80',
    button: 'border-info/20 text-info hover:bg-info/10',
  },
};

export interface StatusBannerProps {
  variant: StatusBannerVariant;
  /** Bold first line, e.g. "Error loading subscription data". */
  title?: string;
  /** Body text under the title (or standalone when there is no title). */
  message?: string;
  /** Small hint line under the message, e.g. "Retrying may resolve this." */
  description?: string;
  /** Optional leading icon, e.g. `<CheckCircle2 className="h-4 w-4 shrink-0" />`. */
  icon?: React.ReactNode;
  /** Label for the action button (Retry, Dismiss, …). Button renders only when set. */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
}

/**
 * Standard status banner for error / success / warning / info feedback,
 * with an optional Retry/Dismiss action. Use for every inline status box
 * so all screens share the same look.
 */
function StatusBanner({
  variant,
  title,
  message,
  description,
  icon,
  actionLabel,
  onAction,
  actionDisabled,
  className,
}: StatusBannerProps) {
  const v = VARIANTS[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'border px-4 py-3 rounded-lg flex items-start justify-between gap-2 sm:gap-4',
        v.box,
        className
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          {title && <p className="text-sm font-medium">{title}</p>}
          {message && <p className={cn('text-sm', title && 'mt-1')}>{message}</p>}
          {description && <p className={cn('text-xs mt-2', v.sub)}>{description}</p>}
        </div>
      </div>
      {actionLabel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          disabled={actionDisabled}
          className={cn('flex-shrink-0', v.button)}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export { StatusBanner };
