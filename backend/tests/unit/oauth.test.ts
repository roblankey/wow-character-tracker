import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  BattleNetOAuthError,
} from '../../src/battlenet/oauth.js';
import { createTestConfig } from '../helpers/testApp.js';

const config = createTestConfig();

describe('buildAuthorizeUrl', () => {
  it('builds a region-specific authorize URL with the expected query params', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-123'));

    expect(url.origin).toBe('https://us.battle.net');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe(config.battlenet.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.battlenet.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('wow.profile');
    expect(url.searchParams.get('state')).toBe('state-123');
  });
});

describe('exchangeCodeForTokens / fetchUserInfo', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges an authorization code for an access token', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-1',
          expires_in: 3600,
          token_type: 'bearer',
        }),
        { status: 200 },
      ),
    );

    const result = await exchangeCodeForTokens(config, 'auth-code');

    expect(result.accessToken).toBe('access-1');
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://us.battle.net/oauth/token');
    expect(init.method).toBe('POST');
    expect((init.body as URLSearchParams).get('grant_type')).toBe('authorization_code');
    expect((init.body as URLSearchParams).get('code')).toBe('auth-code');
  });

  it('throws a BattleNetOAuthError when the token endpoint responds with an error status', async () => {
    fetchMock.mockResolvedValue(new Response('invalid_grant', { status: 400 }));

    await expect(exchangeCodeForTokens(config, 'bad-code')).rejects.toBeInstanceOf(
      BattleNetOAuthError,
    );
  });

  it('fetches the Battle.net account id via userinfo', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 12345, battletag: 'Tester#1234' }), { status: 200 }),
    );

    const info = await fetchUserInfo(config, 'access-1');

    expect(info).toEqual({ id: '12345', battletag: 'Tester#1234' });
  });
});
