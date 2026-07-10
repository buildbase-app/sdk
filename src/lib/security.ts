/**
 * Security utilities for the SDK.
 */

/** Options for {@link validateRedirectUrl}. */
export interface RedirectValidationOptions {
  /**
   * Require absolute URLs to be same-origin with the current page
   * (`window.location.origin`). Relative paths always pass. Use for any
   * user-controllable target (return URLs, `?next=` params) — it turns an
   * open redirect into a same-site navigation. Outside a browser there is no
   * origin to compare against, so absolute URLs are rejected.
   */
  sameOrigin?: boolean;
  /**
   * Origins additionally allowed for absolute URLs, e.g.
   * `['https://checkout.stripe.com']`. Matched against `URL.origin` exactly.
   */
  allowedOrigins?: string[];
}

/**
 * Validate that a URL is safe to redirect to. Returns the URL if safe, null if
 * not.
 *
 * - **Relative paths** (`/dashboard`) are safe and always allowed —
 *   protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms are
 *   not treated as relative.
 * - **Absolute URLs** must be `https:` (or `http:` on localhost). By default
 *   any such URL passes (needed for cross-origin targets like Stripe checkout);
 *   pass `sameOrigin` and/or `allowedOrigins` to restrict — then the URL must
 *   match at least one of them. Always restrict user-controllable targets.
 */
export function validateRedirectUrl(
  url: string | null | undefined,
  options: RedirectValidationOptions = {}
): string | null {
  if (!url || typeof url !== 'string') return null;

  // Relative path: starts with exactly one "/" — a second "/" or a "\" would
  // be parsed by browsers as a protocol-relative URL to another host.
  if (/^\/(?![/\\])/.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not absolute and not a safe relative path (e.g. "javascript:…", "../x")
    return null;
  }

  const isHttps = parsed.protocol === 'https:';
  const isLocalHttp =
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]');
  if (!isHttps && !isLocalHttp) return null;

  // Unrestricted (back-compat default): any https / local-http URL.
  const { sameOrigin, allowedOrigins } = options;
  if (!sameOrigin && !allowedOrigins?.length) return url;

  if (
    sameOrigin &&
    typeof window !== 'undefined' &&
    window.location &&
    parsed.origin === window.location.origin
  ) {
    return url;
  }
  if (allowedOrigins?.some(o => o.replace(/\/+$/, '') === parsed.origin)) {
    return url;
  }
  return null;
}

/**
 * Safely redirect to a URL after validating it.
 * Falls back to fallbackUrl (itself validated — else `/`) if the target URL is
 * invalid. Pass `options` to restrict user-controllable targets (see
 * {@link validateRedirectUrl}).
 *
 * Browser-only: navigation requires `window.location`. On non-browser runtimes
 * (Node, edge, Deno, Bun) there is nothing to navigate, so this is a no-op that
 * returns `false`. Returns `true` when a navigation was initiated. Server code
 * that needs the resolved target should call {@link validateRedirectUrl} and
 * issue the redirect with its own framework (e.g. `Response.redirect`).
 */
export function safeRedirect(
  url: string | null | undefined,
  fallbackUrl: string = '/',
  options: RedirectValidationOptions = {}
): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const validated = validateRedirectUrl(url, options);
  window.location.href = validated ?? validateRedirectUrl(fallbackUrl) ?? '/';
  return true;
}
