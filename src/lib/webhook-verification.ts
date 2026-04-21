/* eslint-disable @typescript-eslint/no-var-requires */
declare const require: (id: string) => any;
declare const Buffer: { from(str: string, encoding: string): { length: number } };

/**
 * Verify that a webhook request came from BuildBase.
 *
 * Uses HMAC-SHA256 signature verification with timing-safe comparison
 * to prevent timing attacks. Node.js only (uses `crypto` module).
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

  // Node.js crypto (require at runtime to avoid browser bundling issues)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    // Timing-safe comparison
    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
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
