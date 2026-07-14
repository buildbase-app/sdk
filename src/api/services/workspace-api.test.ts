import { describe, expect, it, vi } from 'vitest';
import { WorkspaceApi } from './workspace-api';

/** Fetch mock with explicit params so `mock.calls[0][0]` typechecks. */
function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl);
}

function makeApi(fetchImpl: ReturnType<typeof mockFetch>): WorkspaceApi {
  return new WorkspaceApi({
    serverUrl: 'https://api.example.com',
    version: 'v1',
    orgId: 'org_1',
    sessionId: 'sess_1', // avoid the localStorage fallback in a node env
    timeout: 0,
    maxRetries: 0,
    fetch: fetchImpl,
  } as any);
}

describe('WorkspaceApi.selectFreePlan (envelope unification)', () => {
  it('resolves with the { success, message } envelope (endpoint has no data payload)', async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response(JSON.stringify({ success: true, message: 'Free plan assigned' }), {
          status: 200,
        })
    );
    const api = makeApi(fetchMock);

    const result = await api.selectFreePlan('ws_1', 'pv_1');

    expect(result).toEqual({ success: true, message: 'Free plan assigned' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/api/v1/public/workspaces/ws_1/subscription/select-free-plan'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ planVersionId: 'pv_1' }),
    });
  });

  it('unwraps a data payload if the backend ever adds one, preserving falsy values', async () => {
    // unwrapResponse's `data !== undefined` guard: falsy payloads (0, false, '')
    // are valid data and must not fall back to the envelope.
    const fetchMock = mockFetch(
      async () => new Response(JSON.stringify({ success: true, data: false }), { status: 200 })
    );
    const api = makeApi(fetchMock);

    const result = await api.selectFreePlan('ws_1', 'pv_1');

    expect(result as unknown).toBe(false);
  });

  it('throws the server message on a non-2xx response', async () => {
    const fetchMock = mockFetch(
      async () => new Response(JSON.stringify({ message: 'plan is not freemium' }), { status: 400 })
    );
    const api = makeApi(fetchMock);

    await expect(api.selectFreePlan('ws_1', 'pv_1')).rejects.toThrow('plan is not freemium');
  });

  it('falls back to a status-based message on a non-JSON error body', async () => {
    const fetchMock = mockFetch(
      async () => new Response('oops', { status: 500, statusText: 'Internal Server Error' })
    );
    const api = makeApi(fetchMock);

    await expect(api.selectFreePlan('ws_1', 'pv_1')).rejects.toThrow(
      'Failed to select free plan (500: Internal Server Error)'
    );
  });

  it('throws on a 2xx envelope with success: false (previously resolved silently)', async () => {
    const fetchMock = mockFetch(
      async () =>
        new Response(JSON.stringify({ success: false, message: 'workspace has open invoices' }), {
          status: 200,
        })
    );
    const api = makeApi(fetchMock);

    await expect(api.selectFreePlan('ws_1', 'pv_1')).rejects.toThrow('workspace has open invoices');
  });

  it('URI-encodes path segments (apiPath)', async () => {
    const fetchMock = mockFetch(
      async () => new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200 })
    );
    const api = makeApi(fetchMock);

    await api.selectFreePlan('ws/../evil', 'pv_1');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/api/v1/public/workspaces/ws%2F..%2Fevil/subscription/select-free-plan'
    );
  });
});
