/**
 * Security utilities for the SDK.
 */

/**
 * Validate that a URL is safe to redirect to.
 * Prevents open redirect attacks by ensuring the URL uses https (or http on localhost).
 * Returns the URL if safe, or null if not.
 */
export function validateRedirectUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);

    // Allow https in production
    if (parsed.protocol === 'https:') return url;

    // Allow http only on localhost for development
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1')
    ) {
      return url;
    }

    return null;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Safely redirect to a URL after validating it.
 * Falls back to fallbackUrl if the target URL is invalid.
 *
 * Browser-only: navigation requires `window.location`. On non-browser runtimes
 * (Node, edge, Deno, Bun) there is nothing to navigate, so this is a no-op that
 * returns `false`. Returns `true` when a navigation was initiated. Server code
 * that needs the resolved target should call {@link validateRedirectUrl} and
 * issue the redirect with its own framework (e.g. `Response.redirect`).
 */
export function safeRedirect(url: string | null | undefined, fallbackUrl: string = '/'): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const validated = validateRedirectUrl(url);
  window.location.href = validated ?? fallbackUrl;
  return true;
}
