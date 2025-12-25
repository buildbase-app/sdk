/**
 * Shared localStorage utilities
 */

/**
 * Safe localStorage getter
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
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
    console.warn(`Failed to save ${key} to localStorage:`, error);
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
    console.warn(`Failed to remove ${key} from localStorage:`, error);
  }
}

/**
 * Safe JSON parse from localStorage
 */
export function getStorageJSON<T>(key: string): T | null {
  const item = getStorageItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to parse ${key} from localStorage:`, error);
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
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
}

