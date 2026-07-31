import type { Config } from '../config.js';

const OAUTH_SCOPE = 'wow.profile';

/** Battle.net OAuth is served from a region-specific host for us/eu/kr/tw. */
function oauthHost(region: string): string {
  return `https://${region}.battle.net`;
}

export interface TokenResult {
  accessToken: string;
  expiresAt: Date;
}

interface TokenResponseBody {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class BattleNetOAuthError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BattleNetOAuthError';
  }
}

export function buildAuthorizeUrl(config: Config, state: string): string {
  const url = new URL('/oauth/authorize', oauthHost(config.battlenet.region));
  url.searchParams.set('client_id', config.battlenet.clientId);
  url.searchParams.set('redirect_uri', config.battlenet.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', OAUTH_SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

async function requestToken(config: Config, body: URLSearchParams): Promise<TokenResult> {
  const basicAuth = Buffer.from(
    `${config.battlenet.clientId}:${config.battlenet.clientSecret}`,
  ).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${oauthHost(config.battlenet.region)}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch (cause) {
    throw new BattleNetOAuthError('Failed to reach Battle.net OAuth token endpoint', cause);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new BattleNetOAuthError(
      `Battle.net token request failed with status ${response.status}: ${text}`,
    );
  }

  const json = (await response.json()) as TokenResponseBody;

  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

/**
 * Battle.net's user-authorization flow does not issue refresh tokens — the
 * only way to get a new access token is to have the user re-authorize
 * (FR-010's reconnect-replaces-existing-connection flow doubles as this).
 */
export function exchangeCodeForTokens(config: Config, code: string): Promise<TokenResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.battlenet.redirectUri,
  });
  return requestToken(config, body);
}

export interface BattleNetUserInfo {
  id: string;
  battletag: string;
}

export async function fetchUserInfo(
  config: Config,
  accessToken: string,
): Promise<BattleNetUserInfo> {
  let response: Response;
  try {
    response = await fetch(`${oauthHost(config.battlenet.region)}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (cause) {
    throw new BattleNetOAuthError('Failed to reach Battle.net userinfo endpoint', cause);
  }

  if (!response.ok) {
    throw new BattleNetOAuthError(
      `Battle.net userinfo request failed with status ${response.status}`,
    );
  }

  const json = (await response.json()) as { id: number; battletag: string };
  return { id: String(json.id), battletag: json.battletag };
}
