/**
 * Auth intent preservation — saves and restores the URL the user was on
 * before being redirected to login. Survives the OAuth round-trip via localStorage.
 */

import { validateRedirectUrl } from './security';
import { getStorageJSON, removeStorageItem, setStorageJSON } from './storage';

const AUTH_INTENT_KEY = 'saas-auth-intent';
const AUTH_INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface AuthIntent {
  returnUrl: string;
  createdAt: number;
}

function isValidIntent(data: unknown): data is AuthIntent {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as AuthIntent).returnUrl === 'string' &&
    typeof (data as AuthIntent).createdAt === 'number'
  );
}

/**
 * Save the current URL as the post-auth redirect target.
 * Validates the URL before storing — rejects unsafe URLs silently. Same-origin
 * only: the return URL is "where the user was", never another site.
 */
export function saveAuthIntent(returnUrl: string): void {
  if (!validateRedirectUrl(returnUrl, { sameOrigin: true })) return;
  setStorageJSON<AuthIntent>(AUTH_INTENT_KEY, {
    returnUrl,
    createdAt: Date.now(),
  });
}

/**
 * Read and delete the saved auth intent atomically.
 * Returns the validated return URL, or null if expired/invalid/missing.
 */
export function consumeAuthIntent(): string | null {
  const intent = getStorageJSON<AuthIntent>(AUTH_INTENT_KEY, isValidIntent);
  removeStorageItem(AUTH_INTENT_KEY);

  if (!intent) return null;

  // Check TTL
  if (Date.now() - intent.createdAt > AUTH_INTENT_TTL_MS) return null;

  // Re-validate URL on read (defense against localStorage tampering) — a
  // tampered value pointing at another origin must not survive the round-trip.
  return validateRedirectUrl(intent.returnUrl, { sameOrigin: true });
}

/**
 * Clear any saved auth intent without reading it.
 */
export function clearAuthIntent(): void {
  removeStorageItem(AUTH_INTENT_KEY);
}
