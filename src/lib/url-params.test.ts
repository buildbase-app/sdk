import { describe, expect, it } from 'vitest';
import { createBBUrl, createCheckoutRedirectUrls } from './url-params';

describe('createBBUrl', () => {
  it('builds a URL with the bb param on a valid base', () => {
    const url = new URL(createBBUrl({ screen: 'users' }, 'https://app.example.com/settings'));
    expect(url.origin).toBe('https://app.example.com');
    expect(url.pathname).toBe('/settings');
    expect(url.searchParams.get('bb')).toBeTruthy();
  });

  it('strips existing query params from the base', () => {
    const url = new URL(
      createBBUrl({ screen: 'users' }, 'https://app.example.com/settings?old=1&x=2')
    );
    expect(url.searchParams.get('old')).toBeNull();
    expect([...url.searchParams.keys()]).toEqual(['bb']);
  });

  it('throws on an invalid explicit base instead of silently using localhost', () => {
    expect(() => createBBUrl({ screen: 'users' }, 'not a url')).toThrow(/invalid base URL/);
    expect(() => createBBUrl({ screen: 'users' }, '')).toThrow(/invalid base URL/);
  });

  it('falls back to https://localhost only when no base exists (server-side, no window)', () => {
    const url = new URL(createBBUrl({ screen: 'users' }));
    expect(url.origin).toBe('https://localhost');
  });
});

describe('createCheckoutRedirectUrls', () => {
  it('produces success and cancel URLs on the given base', () => {
    const { successUrl, cancelUrl } = createCheckoutRedirectUrls(
      'ws_1',
      'https://app.example.com/billing'
    );
    expect(new URL(successUrl).origin).toBe('https://app.example.com');
    expect(new URL(cancelUrl).origin).toBe('https://app.example.com');
    expect(successUrl).not.toBe(cancelUrl);
  });
});
