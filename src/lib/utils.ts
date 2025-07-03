import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCSSVariables() {
  return {
    '--saas-os-background': '0 0% 100%',
    '--saas-os-foreground': '222.2 84% 4.9%',
    '--saas-os-card': '0 0% 100%',
    '--saas-os-card-foreground': '222.2 84% 4.9%',
    '--saas-os-popover': '0 0% 100%',
    '--saas-os-popover-foreground': '222.2 84% 4.9%',
    '--saas-os-primary': '222.2 47.4% 11.2%',
    '--saas-os-primary-foreground': '210 40% 98%',
    '--saas-os-secondary': '210 40% 96%',
    '--saas-os-secondary-foreground': '222.2 84% 4.9%',
    '--saas-os-muted': '210 40% 96%',
    '--saas-os-muted-foreground': '215.4 16.3% 46.9%',
    '--saas-os-accent': '210 40% 96%',
    '--saas-os-accent-foreground': '222.2 84% 4.9%',
    '--saas-os-destructive': '0 84.2% 60.2%',
    '--saas-os-destructive-foreground': '210 40% 98%',
    '--saas-os-border': '214.3 31.8% 91.4%',
    '--saas-os-input': '214.3 31.8% 91.4%',
    '--saas-os-ring': '222.2 84% 4.9%',
    '--saas-os-radius': '0.5rem',
  } as const;
} 