import { describe, expect, it, vi } from 'vitest';
import { DevicesApi } from './devices-api';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl);
}

function makeApi(fetchImpl: ReturnType<typeof mockFetch>): DevicesApi {
  return new DevicesApi({
    serverUrl: 'https://api.example.com',
    version: 'v1',
    sessionId: 'sess_1', // avoid the localStorage fallback in a node env
    timeout: 0,
    maxRetries: 0,
    fetch: fetchImpl,
  } as any);
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('DevicesApi', () => {
  it('list() GETs /public/devices and unwraps { devices }', async () => {
    const devices = [{ deviceId: 'd1', name: 'Laptop', current: true }];
    const fetchMock = mockFetch(async () => json({ devices }));
    const result = await makeApi(fetchMock).list();

    expect(result).toEqual(devices);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/public/devices');
    expect((fetchMock.mock.calls[0][1]?.method ?? 'GET').toUpperCase()).toBe('GET');
  });

  it('list() returns [] when the payload has no devices', async () => {
    const fetchMock = mockFetch(async () => json({}));
    expect(await makeApi(fetchMock).list()).toEqual([]);
  });

  it('rename() PATCHes the device with the new name', async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));
    await makeApi(fetchMock).rename('d1', 'Work laptop');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/public/devices/d1');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Work laptop' });
  });

  it('signOut() DELETEs the device (no forget flag) and returns the count', async () => {
    const fetchMock = mockFetch(async () => json({ success: true, revokedSessions: 2 }));
    const result = await makeApi(fetchMock).signOut('d1');

    expect(result).toEqual({ success: true, revokedSessions: 2 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/public/devices/d1');
    expect(init?.method).toBe('DELETE');
  });

  it('forget() DELETEs the device with ?forget=true', async () => {
    const fetchMock = mockFetch(async () => json({ success: true, revokedSessions: 1 }));
    await makeApi(fetchMock).forget('d1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/v1/public/devices/d1?forget=true');
    expect(init?.method).toBe('DELETE');
  });

  it('URL-encodes the device id in the path', async () => {
    const fetchMock = mockFetch(async () => json({ success: true }));
    await makeApi(fetchMock).signOut('a/b?c');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/api/v1/public/devices/a%2Fb%3Fc'
    );
  });

  it('throws the server message on a non-2xx response', async () => {
    const fetchMock = mockFetch(async () => json({ message: 'device not found' }, 404));
    await expect(makeApi(fetchMock).list()).rejects.toThrow('device not found');
  });
});
