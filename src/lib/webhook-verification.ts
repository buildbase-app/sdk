import { hexToBytes, hmacSha256, timingSafeEqualBytes, utf8Bytes } from './sha256';

/**
 * Verify that a webhook request came from BuildBase.
 *
 * Uses HMAC-SHA256 signature verification with timing-safe comparison
 * to prevent timing attacks. Runtime-agnostic: the HMAC is a dependency-free
 * pure-JS implementation (shared with the OAuth app-bridge), so it behaves
 * identically under CJS, ESM, bundlers, edge runtimes, Deno, Bun, and browsers —
 * no Node `crypto`/`require`/`Buffer`.
 *
 * @example
 * ```ts
 * import { verifyWebhookSignature } from '@buildbase/sdk';
 *
 * app.post('/webhooks', (req, res) => {
 *   const isValid = verifyWebhookSignature({
 *     body: req.body,            // raw request body string
 *     signature: req.headers['x-buildbase-signature'],
 *     timestamp: req.headers['x-buildbase-timestamp'],
 *     secret: process.env.WEBHOOK_SECRET,
 *   });
 *
 *   if (!isValid) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *
 *   const event = JSON.parse(req.body);
 *   // Handle event...
 * });
 * ```
 */
export function verifyWebhookSignature(options: {
  /** Raw request body string (must match exactly what was sent) */
  body: string;
  /** Value of x-buildbase-signature header (format: sha256=<hex>) */
  signature: string | undefined | null;
  /** Value of x-buildbase-timestamp header */
  timestamp: string | undefined | null;
  /** Your webhook endpoint's signing secret */
  secret: string;
  /** Max age in seconds to accept (default: 300 = 5 minutes). Set to 0 to skip age check. */
  maxAgeSeconds?: number;
}): boolean {
  const { body, signature, timestamp, secret, maxAgeSeconds = 300 } = options;

  if (!signature || !timestamp || !secret || !body) return false;

  // Extract hex from "sha256=<hex>"
  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) return false;
  const signatureHex = signature.slice(expectedPrefix.length);

  // Check timestamp age (replay protection)
  if (maxAgeSeconds > 0) {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return false;
    const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (age > maxAgeSeconds) return false;
  }

  // Dependency-free pure-JS HMAC-SHA256 — works on every JS runtime.
  const provided = hexToBytes(signatureHex);
  if (!provided) return false; // malformed (non-hex) signature
  const expected = hmacSha256(utf8Bytes(secret), utf8Bytes(`${timestamp}.${body}`));
  // Guard against length mismatch before the constant-time compare.
  if (provided.length !== expected.length) return false;
  return timingSafeEqualBytes(provided, expected);
}

/**
 * Parse and verify a webhook event in one step.
 * Returns the parsed event if valid, or null if verification fails.
 *
 * @example
 * ```ts
 * import { parseWebhookEvent } from '@buildbase/sdk';
 *
 * const event = parseWebhookEvent({
 *   body: req.body,
 *   signature: req.headers['x-buildbase-signature'],
 *   timestamp: req.headers['x-buildbase-timestamp'],
 *   secret: process.env.WEBHOOK_SECRET,
 * });
 *
 * if (!event) {
 *   return res.status(401).json({ error: 'Invalid webhook' });
 * }
 *
 * switch (event.event) {
 *   case 'subscription.created':
 *     console.log('New subscription:', event.data.subscription);
 *     break;
 *   case 'workspace.member_added':
 *     console.log('New member:', event.data.targetUser);
 *     break;
 * }
 * ```
 */
export function parseWebhookEvent(options: {
  body: string;
  signature: string | undefined | null;
  timestamp: string | undefined | null;
  secret: string;
  maxAgeSeconds?: number;
}): { event: string; timestamp: number; data: Record<string, any> } | null {
  if (!verifyWebhookSignature(options)) return null;

  try {
    return JSON.parse(options.body);
  } catch {
    return null;
  }
}
