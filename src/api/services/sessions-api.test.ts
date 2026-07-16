import { describe, expect, it, vi } from 'vitest';
import { SessionsApi } from './sessions-api';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl);
}

function makeApi(fetchImpl: ReturnType<typeof mockFetch>): SessionsApi {
  return new SessionsApi({
    serverUrl: 'https://api.example.com',
    version: 'v1',
    sessionId: 'sess_1', // avoid the localStorage fallback in a node env
    timeout: 0,
    maxRetries: 0,
    fetch: fetchImpl,
  } as any);
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('SessionsApi', () => {
  it('list() GETs /public/sessions and unwraps { sessions }', async () => {
    const sessions = [{ id: 's1', deviceId: 'd1', current: true }];
    const fetchMock = mockFetch(async () => json({ sessions }));
    const result = await makeApi(fetchMock).list();

    expect(result).toEqual(sessions);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/public/sessions');
    expect((fetchMock.mock.calls[0][1]?.method ?? 'GET').toUpperCase()).toBe('GET');
  });

  it('list() returns [] when the payload has no sessions', async () => {
    const fetchMock = mockFetch(async () => json({}));
    expect(await makeApi(fetchMock).list()).toEqual([]);
  });

  it('revoke() DELETEs the session by its public handle', async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));
    await makeApi(fetchMock).revoke('mirror_1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/public/sessions/mirror_1');
    expect(init?.method).toBe('DELETE');
  });

  it('URL-encodes the session handle in the path', async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));
    await makeApi(fetchMock).revoke('a/b');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/public/sessions/a%2Fb');
  });

  it('throws the server message on a non-2xx response', async () => {
    const fetchMock = mockFetch(async () => json({ message: 'session not found' }, 404));
    await expect(makeApi(fetchMock).revoke('nope')).rejects.toThrow('session not found');
  });
});
