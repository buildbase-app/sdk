/**
 * BuildBase URL parameter utilities.
 *
 * Single URL param `bb` carries comma-separated key:value pairs.
 * No collision with user's own URL params.
 *
 * Format: ?bb=key:value,key:value,key:value
 *
 * Reserved keys:
 *   screen   → settings section to open (subscription, users, etc.)
 *   ws       → workspace ID to switch to
 *   action   → what triggered it (checkout, billing, invite, etc.)
 *   status   → result status (success, cancel, error)
 *
 * @example
 * ```ts
 * import { createBBUrl, readBBParams, cleanBBParams } from '@buildbase/sdk'
 *
 * // After Stripe checkout
 * const url = createBBUrl({ action: 'checkout', status: 'success', ws: workspaceId, screen: 'subscription' })
 * // → https://app.com/dashboard?bb=action:checkout,status:success,ws:65abc,screen:subscription
 *
 * // Read on page load
 * const params = readBBParams()
 * // → { action: 'checkout', status: 'success', ws: '65abc', screen: 'subscription' }
 *
 * // Clean up
 * cleanBBParams()
 * ```
 */

/** The single URL param name used by the SDK */
export const BB_PARAM = 'bb';

// ─── Encode / Decode ───────────────────────────────────────────────────────────

/**
 * Encode a record of key-value pairs into the bb param format.
 * ?bb=key:value,key:value
 */
function encodeBBParam(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}:${encodeURIComponent(v)}`)
    .join(',');
}

/**
 * Decode the bb param string into a record of key-value pairs.
 */
function decodeBBParam(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw) return result;

  const pairs = raw.split(',');
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) continue;
    const key = decodeURIComponent(pair.slice(0, colonIndex));
    const value = decodeURIComponent(pair.slice(colonIndex + 1));
    if (key) result[key] = value;
  }
  return result;
}

// ─── Build URLs ────────────────────────────────────────────────────────────────

/**
 * Build a URL with BuildBase params.
 *
 * @param params - Key-value pairs to encode (screen, ws, action, status, or any custom key)
 * @param baseUrl - Base URL (defaults to current page)
 *
 * @example
 * ```ts
 * // Stripe checkout redirect
 * createBBUrl({ action: 'checkout', status: 'success', ws: workspaceId, screen: 'subscription' })
 *
 * // Direct link to settings
 * createBBUrl({ screen: 'users' })
 *
 * // Custom data
 * createBBUrl({ action: 'invite', ws: workspaceId, email: 'user@example.com' })
 * ```
 */
export function createBBUrl(params: Record<string, string>, baseUrl?: string): string {
  let url: URL;
  try {
    const raw =
      baseUrl || (typeof window !== 'undefined' ? window.location.href : 'https://localhost');
    url = new URL(raw);
    // Strip existing query params — only keep the path. The bb param is the only one we need.
    url.search = '';
  } catch {
    url = new URL('https://localhost');
  }

  url.searchParams.set(BB_PARAM, encodeBBParam(params));
  return url.toString();
}

/**
 * Build success + cancel URL pair for Stripe checkout redirects.
 * Both include the workspace ID and screen:subscription.
 */
export function createCheckoutRedirectUrls(
  workspaceId: string,
  baseUrl?: string
): { successUrl: string; cancelUrl: string } {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.href : undefined);
  return {
    successUrl: createBBUrl(
      { action: 'checkout', status: 'success', ws: workspaceId, screen: 'subscription' },
      base
    ),
    cancelUrl: createBBUrl(
      { action: 'checkout', status: 'cancel', ws: workspaceId, screen: 'subscription' },
      base
    ),
  };
}

// ─── Read URLs ─────────────────────────────────────────────────────────────────

/**
 * Read the `bb` param from the current URL.
 * Returns null if no `bb` param is present.
 * Returns a plain object of key-value pairs.
 *
 * Common keys: screen, ws, action, status
 */
export function readBBParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const bbParam = params.get(BB_PARAM);
    if (!bbParam) return null;

    const decoded = decodeBBParam(bbParam);
    return Object.keys(decoded).length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

// ─── Clean URLs ────────────────────────────────────────────────────────────────

/**
 * Remove the `bb` param from the current URL without triggering navigation.
 */
export function cleanBBParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(BB_PARAM)) {
      url.searchParams.delete(BB_PARAM);
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // Ignore URL errors
  }
}
