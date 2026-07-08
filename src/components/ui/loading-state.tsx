import { Loader2 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  /** Text next to the spinner. Defaults to the translated "Loading…". */
  label?: string;
  className?: string;
}

/**
 * Standard inline loading box: gray bordered bar with a spinner and label.
 * Use for in-place refreshes where a skeleton would be too heavy;
 * use `Skeleton`/`SettingSkeleton` for initial screen loads.
 */
function LoadingState({ label, className }: LoadingStateProps) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground',
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
      <span>{label ?? t('settings.common.loading')}</span>
    </div>
  );
}

export { LoadingState };
