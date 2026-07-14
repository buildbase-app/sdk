import { describe, expect, it, vi } from 'vitest';
import { AuthApi } from './auth-api';

/** Fetch mock with explicit params so `mock.calls[0][0]` typechecks. */
function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl);
}

function makeApi(fetchImpl: ReturnType<typeof mockFetch>): AuthApi {
  // The public constructor type is narrow (serverUrl/version/sessionId); the
  // BaseApi test knobs (fetch, timeout) are injected via cast, same pattern
  // as api-base.test.ts.
  return new AuthApi({
    serverUrl: 'https://api.example.com',
    version: 'v1',
    sessionId: 'sess_1', // avoid the localStorage fallback in a node env
    timeout: 0,
    maxRetries: 0,
    fetch: fetchImpl,
  } as any);
}

const params = {
  orgId: 'org_1',
  clientId: 'client_1',
  redirect: { success: 'https://app.example.com/ok', error: 'https://app.example.com/err' },
};

describe('AuthApi.requestAuth (envelope unification)', () => {
  it('unwraps the { success, data } envelope and resolves with the payload', async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { redirectUrl: 'https://auth.example.com/authorize?x=1' },
            message: 'ok',
          }),
          { status: 200 }
        )
    );
    const api = makeApi(fetchMock);

    const result = await api.requestAuth(params);

    expect(result).toEqual({ redirectUrl: 'https://auth.example.com/authorize?x=1' });
    // Hits the /auth base path, not /public
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/auth/request');
  });

  it('throws the server message on a non-2xx response', async () => {
    const fetchMock = mockFetch(
      async () => new Response(JSON.stringify({ message: 'invalid client_id' }), { status: 400 })
    );
    const api = makeApi(fetchMock);

    await expect(api.requestAuth(params)).rejects.toThrow('invalid client_id');
  });

  it('falls back to a status-based message on a non-JSON error body', async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response('<html>bad gateway</html>', { status: 502, statusText: 'Bad Gateway' })
    );
    const api = makeApi(fetchMock);

    await expect(api.requestAuth(params)).rejects.toThrow(
      'Failed to initiate authentication (502: Bad Gateway)'
    );
  });

  it('throws on a 2xx envelope with success: false (previously resolved silently)', async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response(JSON.stringify({ success: false, message: 'org is disabled' }), {
          status: 200,
        })
    );
    const api = makeApi(fetchMock);

    await expect(api.requestAuth(params)).rejects.toThrow('org is disabled');
  });

  it('throws the default message when success: false has no message', async () => {
    const fetchMock = mockFetch(
      async () => new Response(JSON.stringify({ success: false }), { status: 200 })
    );
    const api = makeApi(fetchMock);

    await expect(api.requestAuth(params)).rejects.toThrow('Failed to initiate authentication');
  });
});
