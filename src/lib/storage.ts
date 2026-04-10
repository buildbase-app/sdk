/**
 * Shared localStorage utilities
 */

import { handleError } from './error-handler';

/**
 * Safe localStorage getter
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    handleError(error, {
      component: 'storage',
      action: 'getStorageItem',
      metadata: { key },
    });
    return null;
  }
}

/**
 * Safe localStorage setter
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    handleError(error, {
      component: 'storage',
      action: 'setStorageItem',
      metadata: { key },
    });
  }
}

/**
 * Safe localStorage remover
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    handleError(error, {
      component: 'storage',
      action: 'removeStorageItem',
      metadata: { key },
    });
  }
}

/**
 * Safe JSON parse from localStorage.
 * Optionally accepts a validate function to verify the parsed data matches expected shape.
 * If validation fails, the corrupted entry is removed and null is returned.
 */
export function getStorageJSON<T>(key: string, validate?: (data: unknown) => data is T): T | null {
  const item = getStorageItem(key);
  if (!item) return null;
  try {
    const parsed = JSON.parse(item);
    if (validate && !validate(parsed)) {
      handleError(new Error('Storage data failed validation'), {
        component: 'storage',
        action: 'getStorageJSON',
        metadata: { key },
      });
      removeStorageItem(key);
      return null;
    }
    return parsed as T;
  } catch (error) {
    handleError(error, {
      component: 'storage',
      action: 'getStorageJSON',
      metadata: { key },
    });
    removeStorageItem(key); // Clear corrupted data
    return null;
  }
}

/**
 * Safe JSON stringify to localStorage
 */
export function setStorageJSON<T>(key: string, value: T): void {
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    handleError(error, {
      component: 'storage',
      action: 'setStorageJSON',
      metadata: { key },
    });
  }
}
