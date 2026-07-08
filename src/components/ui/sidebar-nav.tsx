import { ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SidebarNavSectionProps {
  /** Uppercase group label shown above the items. */
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** Labeled group of sidebar items. */
function SidebarNavSection({ title, children, className }: SidebarNavSectionProps) {
  return (
    <div className={cn('px-2 flex flex-col gap-1', className)}>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-2 pb-1 shrink-0 whitespace-nowrap">
        {title}
      </div>
      {children}
    </div>
  );
}

export interface SidebarNavItemProps {
  /** Leading icon, e.g. `<UserIcon className="h-3.5 w-3.5" />` */
  icon?: React.ReactNode;
  label: string;
  /** Highlights the item as the current selection. */
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Single sidebar navigation entry with the standard active/hover styling.
 * Mobile-friendly by default: comfortable ~44px touch target and a trailing
 * chevron affordance below the `sm` breakpoint; compact rows on desktop.
 */
function SidebarNavItem({ icon, label, active = false, onClick, className }: SidebarNavItemProps) {
  return (
    <button
      className={cn(
        'flex w-full text-start px-2 py-2.5 sm:py-1 rounded text-sm items-center gap-x-2 sm:gap-x-1 whitespace-nowrap shrink-0',
        active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted hover:text-foreground',
        className
      )}
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 ms-auto opacity-40 sm:hidden rtl:rotate-180"
      />
    </button>
  );
}

export { SidebarNavItem, SidebarNavSection };
