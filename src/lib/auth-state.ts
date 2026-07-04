/**
 * CSRF state parameter for OAuth flow.
 *
 * Generates a random nonce before redirecting to the OAuth provider,
 * stores it in localStorage (survives redirect and cross-tab flows like magic links),
 * and validates it when the callback returns with ?state=...
 *
 * Prevents CSRF attacks where a malicious site tricks the user into
 * completing an OAuth flow initiated by the attacker.
 */

import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

const AUTH_STATE_KEY = 'saas-oauth-state';

/**
 * Generate a cryptographically random state nonce and store it in localStorage.
 * Returns the nonce to include in the auth request.
 * If localStorage is unavailable (SSR, private browsing edge cases) the nonce
 * is still returned but validation on callback will fail safely.
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const state = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

  setStorageItem(AUTH_STATE_KEY, state);
  return state;
}

/**
 * Validate the state parameter returned in the OAuth callback.
 * Reads and deletes the stored state (single use).
 * Returns true if the state matches, false otherwise.
 */
export function validateOAuthState(returnedState: string | null): boolean {
  if (!returnedState) return false;

  const storedState = getStorageItem(AUTH_STATE_KEY);
  removeStorageItem(AUTH_STATE_KEY);

  if (!storedState) return false;

  // Constant-time comparison to prevent timing attacks
  if (storedState.length !== returnedState.length) return false;

  let mismatch = 0;
  for (let i = 0; i < storedState.length; i++) {
    mismatch |= storedState.charCodeAt(i) ^ returnedState.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Clear any pending OAuth state (e.g. on sign-out or error cleanup).
 */
export function clearOAuthState(): void {
  removeStorageItem(AUTH_STATE_KEY);
}
