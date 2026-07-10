import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseApi } from './api-base';

class TestApi extends BaseApi {
  run(path: string, init: RequestInit): Promise<Response> {
    // executeFetch is private; tests reach it deliberately.
    return (this as any).executeFetch(path, init);
  }
}

function makeApi(fetchImpl: typeof fetch, maxRetries = 2): TestApi {
  return new TestApi({
    serverUrl: 'https://api.example.com',
    version: 'v1' as any,
    orgId: 'org_1',
    maxRetries,
    timeout: 0, // no timeout controller — tests drive aborts explicitly
    fetch: fetchImpl,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('retry idempotency', () => {
  it('retries GET on 5xx up to maxRetries', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response('err', { status: 500 }));
    const api = makeApi(fetchMock as any, 2);

    const promise = api.run('things', { method: 'GET' });
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('never retries POST on 5xx (double-charge risk)', async () => {
    const fetchMock = vi.fn(async () => new Response('err', { status: 500 }));
    const api = makeApi(fetchMock as any, 2);

    const res = await api.run('credits/purchase', { method: 'POST', body: '{}' });

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never retries POST on network error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const api = makeApi(fetchMock as any, 2);

    await expect(api.run('credits/consume', { method: 'POST', body: '{}' })).rejects.toThrow(
      'fetch failed'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries GET on network error', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const api = makeApi(fetchMock as any, 1);

    const promise = api.run('things', { method: 'GET' });
    const expectation = expect(promise).rejects.toThrow('fetch failed');
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('abortable retry backoff', () => {
  it('an abort during backoff ends the request immediately with an AbortError', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const api = makeApi(fetchMock as any, 3);
    const controller = new AbortController();

    const promise = api.run('things', { method: 'GET', signal: controller.signal });
    // First attempt fails instantly; the 1s backoff sleep is now pending.
    setTimeout(() => controller.abort(), 5);

    const started = Date.now();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(Date.now() - started).toBeLessThan(500); // did not sit out the 1s backoff
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
