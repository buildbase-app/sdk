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
    <div className={cn('px-2 flex flex-col space-y-1', className)}>
      <div className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide px-2">
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

/** Single sidebar navigation entry with the standard active/hover styling. */
function SidebarNavItem({ icon, label, active = false, onClick, className }: SidebarNavItemProps) {
  return (
    <button
      className={cn(
        'flex w-full text-start px-2 py-1 rounded text-sm items-center gap-x-1',
        active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted hover:text-foreground',
        className
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export { SidebarNavItem, SidebarNavSection };
