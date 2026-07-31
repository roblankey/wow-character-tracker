import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/battlenet/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/battlenet/oauth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    fetchUserInfo: vi.fn(),
  };
});

vi.mock('../../src/battlenet/client.js', () => ({
  fetchFullCharacterRoster: vi.fn(async () => []),
}));

import { exchangeCodeForTokens, fetchUserInfo } from '../../src/battlenet/oauth.js';
import { battleNetConnection } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

async function getIssuedState(app: ReturnType<typeof buildTestApp>['app']): Promise<string> {
  const authorizeResponse = await app.inject({ method: 'GET', url: '/api/connection/authorize' });
  const location = authorizeResponse.headers.location as string;
  return new URL(location, 'http://localhost').searchParams.get('state')!;
}

describe('GET /api/connection/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges the code for tokens and redirects to the roster on success', async () => {
    const { app, db } = buildTestApp();
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: 'access-1',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(fetchUserInfo).mockResolvedValue({ id: 'acct-1', battletag: 'Tester#1234' });

    const state = await getIssuedState(app);
    const response = await app.inject({
      method: 'GET',
      url: `/api/connection/callback?code=abc123&state=${state}`,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('http://localhost:5173');

    const rows = await db.select().from(battleNetConnection);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.battlenetAccountId).toBe('acct-1');
  });

  it('redirects with an error and creates no connection when state is invalid', async () => {
    const { app, db } = buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/connection/callback?code=abc123&state=not-a-real-state',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('http://localhost:5173/?connectionError=1');
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
    expect(await db.select().from(battleNetConnection)).toHaveLength(0);
  });

  it('redirects with an error when Blizzard reports the user denied consent', async () => {
    const { app } = buildTestApp();
    const state = await getIssuedState(app);

    const response = await app.inject({
      method: 'GET',
      url: `/api/connection/callback?state=${state}&error=access_denied`,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('http://localhost:5173/?connectionError=1');
  });
});
