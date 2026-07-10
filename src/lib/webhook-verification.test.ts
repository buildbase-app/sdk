import { describe, expect, it } from 'vitest';
import { bytesToHex, hmacSha256, utf8Bytes } from './sha256';
import { parseWebhookEvent, verifyWebhookSignature } from './webhook-verification';

const SECRET = 'whsec_test_secret';

/** Sign the way the BuildBase server does: HMAC-SHA256 over `${timestamp}.${body}`. */
function sign(body: string, timestamp: string, secret = SECRET): string {
  return 'sha256=' + bytesToHex(hmacSha256(utf8Bytes(secret), utf8Bytes(`${timestamp}.${body}`)));
}

function nowTs(): string {
  return String(Math.floor(Date.now() / 1000));
}

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed payload', () => {
    const body = JSON.stringify({ event: 'subscription.created', data: {} });
    const timestamp = nowTs();
    expect(
      verifyWebhookSignature({ body, timestamp, signature: sign(body, timestamp), secret: SECRET })
    ).toBe(true);
  });

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ event: 'subscription.created', amount: 100 });
    const timestamp = nowTs();
    const signature = sign(body, timestamp);
    const tampered = body.replace('100', '999');
    expect(verifyWebhookSignature({ body: tampered, timestamp, signature, secret: SECRET })).toBe(
      false
    );
  });

  it('rejects a signature made with a different secret', () => {
    const body = '{"event":"x"}';
    const timestamp = nowTs();
    const signature = sign(body, timestamp, 'other_secret');
    expect(verifyWebhookSignature({ body, timestamp, signature, secret: SECRET })).toBe(false);
  });

  it('rejects a replayed timestamp older than maxAgeSeconds', () => {
    const body = '{"event":"x"}';
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const signature = sign(body, old);
    expect(verifyWebhookSignature({ body, timestamp: old, signature, secret: SECRET })).toBe(false);
    // maxAgeSeconds: 0 disables the age check — same payload verifies
    expect(
      verifyWebhookSignature({ body, timestamp: old, signature, secret: SECRET, maxAgeSeconds: 0 })
    ).toBe(true);
  });

  it('binds the signature to the timestamp (swapping it fails)', () => {
    const body = '{"event":"x"}';
    const t1 = nowTs();
    const t2 = String(Number(t1) + 1);
    const signature = sign(body, t1);
    expect(verifyWebhookSignature({ body, timestamp: t2, signature, secret: SECRET })).toBe(false);
  });

  it('rejects missing/malformed inputs', () => {
    const body = '{"event":"x"}';
    const timestamp = nowTs();
    const signature = sign(body, timestamp);
    expect(verifyWebhookSignature({ body, timestamp, signature: null, secret: SECRET })).toBe(
      false
    );
    expect(verifyWebhookSignature({ body, timestamp: null, signature, secret: SECRET })).toBe(
      false
    );
    expect(verifyWebhookSignature({ body, timestamp, signature, secret: '' })).toBe(false);
    expect(verifyWebhookSignature({ body: '', timestamp, signature, secret: SECRET })).toBe(false);
    // no sha256= prefix
    expect(
      verifyWebhookSignature({ body, timestamp, signature: signature.slice(7), secret: SECRET })
    ).toBe(false);
    // non-hex signature
    expect(
      verifyWebhookSignature({ body, timestamp, signature: 'sha256=zznothex', secret: SECRET })
    ).toBe(false);
    // non-numeric timestamp
    expect(verifyWebhookSignature({ body, timestamp: 'abc', signature, secret: SECRET })).toBe(
      false
    );
  });
});

describe('parseWebhookEvent', () => {
  it('returns the parsed event for a valid payload', () => {
    const payload = { event: 'workspace.member_added', timestamp: 123, data: { userId: 'u1' } };
    const body = JSON.stringify(payload);
    const timestamp = nowTs();
    const event = parseWebhookEvent({
      body,
      timestamp,
      signature: sign(body, timestamp),
      secret: SECRET,
    });
    expect(event).toEqual(payload);
  });

  it('returns null on bad signature or unparseable body', () => {
    const timestamp = nowTs();
    expect(
      parseWebhookEvent({
        body: '{"event":"x"}',
        timestamp,
        signature: 'sha256=00',
        secret: SECRET,
      })
    ).toBeNull();
    const notJson = 'not json';
    expect(
      parseWebhookEvent({
        body: notJson,
        timestamp,
        signature: sign(notJson, timestamp),
        secret: SECRET,
      })
    ).toBeNull();
  });
});
