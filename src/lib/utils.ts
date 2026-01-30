import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Check if running in development mode.
 * Safe for browser bundles where process may be undefined.
 */
export function isDevelopment(): boolean {
  try {
    const g =
      typeof globalThis !== 'undefined'
        ? (globalThis as { process?: { env?: { NODE_ENV?: string } } })
        : null;
    return g?.process?.env?.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
