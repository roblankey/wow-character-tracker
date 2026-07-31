import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../../src/api/client.js';

describe('apiClient request headers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send a Content-Type header on bodyless requests (DELETE)', async () => {
    await apiClient.disconnect();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
    // Fastify's JSON body parser rejects a JSON content-type on an empty
    // body, so a bodyless request must not send one (regression test).
    expect((init.headers as Record<string, string> | undefined)?.['Content-Type']).toBeUndefined();
  });

  it('does not send a Content-Type header on the bodyless refresh POST', async () => {
    await apiClient.refreshCharacters();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string> | undefined)?.['Content-Type']).toBeUndefined();
  });
});
