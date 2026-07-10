import { afterEach, describe, expect, it } from 'vitest';
import { validateRedirectUrl } from './security';

const g = globalThis as { window?: unknown };

function withWindow(origin: string) {
  g.window = { location: { origin, href: `${origin}/page` } };
}

afterEach(() => {
  delete g.window;
});

describe('validateRedirectUrl', () => {
  it('rejects empty / non-string input', () => {
    expect(validateRedirectUrl(null)).toBeNull();
    expect(validateRedirectUrl(undefined)).toBeNull();
    expect(validateRedirectUrl('')).toBeNull();
  });

  it('allows relative paths', () => {
    expect(validateRedirectUrl('/dashboard')).toBe('/dashboard');
    expect(validateRedirectUrl('/a/b?c=1#d')).toBe('/a/b?c=1#d');
  });

  it('rejects protocol-relative and backslash forms', () => {
    expect(validateRedirectUrl('//evil.com')).toBeNull();
    expect(validateRedirectUrl('//evil.com/path')).toBeNull();
    expect(validateRedirectUrl('/\\evil.com')).toBeNull();
  });

  it('rejects non-URL, non-path strings', () => {
    expect(validateRedirectUrl('javascript:alert(1)')).toBeNull();
    expect(validateRedirectUrl('../up')).toBeNull();
    expect(validateRedirectUrl('dashboard')).toBeNull();
  });

  it('allows https URLs by default (cross-origin, e.g. Stripe checkout)', () => {
    expect(validateRedirectUrl('https://checkout.stripe.com/c/pay_123')).toBe(
      'https://checkout.stripe.com/c/pay_123'
    );
  });

  it('allows http only on localhost', () => {
    expect(validateRedirectUrl('http://localhost:3000/x')).toBe('http://localhost:3000/x');
    expect(validateRedirectUrl('http://127.0.0.1/x')).toBe('http://127.0.0.1/x');
    expect(validateRedirectUrl('http://[::1]:3000/x')).toBe('http://[::1]:3000/x');
    expect(validateRedirectUrl('http://evil.com/x')).toBeNull();
  });

  describe('sameOrigin', () => {
    it('accepts the current origin, rejects others', () => {
      withWindow('https://app.example.com');
      expect(validateRedirectUrl('https://app.example.com/settings', { sameOrigin: true })).toBe(
        'https://app.example.com/settings'
      );
      expect(validateRedirectUrl('https://evil.com/settings', { sameOrigin: true })).toBeNull();
    });

    it('still allows relative paths', () => {
      expect(validateRedirectUrl('/settings', { sameOrigin: true })).toBe('/settings');
    });

    it('rejects absolute URLs outside a browser (no origin to compare)', () => {
      expect(
        validateRedirectUrl('https://app.example.com/settings', { sameOrigin: true })
      ).toBeNull();
    });
  });

  describe('allowedOrigins', () => {
    it('accepts allowlisted origins only', () => {
      const opts = { allowedOrigins: ['https://checkout.stripe.com'] };
      expect(validateRedirectUrl('https://checkout.stripe.com/pay', opts)).toBe(
        'https://checkout.stripe.com/pay'
      );
      expect(validateRedirectUrl('https://evil.com/pay', opts)).toBeNull();
    });

    it('tolerates trailing slashes in the allowlist', () => {
      expect(
        validateRedirectUrl('https://checkout.stripe.com/pay', {
          allowedOrigins: ['https://checkout.stripe.com/'],
        })
      ).toBe('https://checkout.stripe.com/pay');
    });

    it('combines with sameOrigin as a union', () => {
      withWindow('https://app.example.com');
      const opts = { sameOrigin: true, allowedOrigins: ['https://checkout.stripe.com'] };
      expect(validateRedirectUrl('https://app.example.com/x', opts)).toBe(
        'https://app.example.com/x'
      );
      expect(validateRedirectUrl('https://checkout.stripe.com/x', opts)).toBe(
        'https://checkout.stripe.com/x'
      );
      expect(validateRedirectUrl('https://evil.com/x', opts)).toBeNull();
    });
  });
});
