function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface Config {
  port: number;
  battlenet: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    region: string;
  };
  dbPath: string;
  /** 32-byte key (as a Buffer) used to encrypt OAuth tokens at rest. */
  tokenEncryptionKey: Buffer;
  /** Secret used to sign the per-browser-session cookie. */
  sessionCookieSecret: string;
  /**
   * Origin the browser should land on after the Battle.net OAuth callback.
   * Blizzard redirects the browser directly to the backend, not through the
   * frontend dev proxy, so this must be an absolute URL — a relative
   * redirect would resolve against the backend's own origin instead.
   */
  frontendUrl: string;
}

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached) return cached;
  cached = {
    port: Number(process.env.PORT ?? 3001),
    battlenet: {
      clientId: requireEnv('BATTLENET_CLIENT_ID'),
      clientSecret: requireEnv('BATTLENET_CLIENT_SECRET'),
      redirectUri: requireEnv('BATTLENET_REDIRECT_URI'),
      region: process.env.BATTLENET_REGION ?? 'us',
    },
    dbPath: process.env.DB_PATH ?? './data/wow-character-tracker.sqlite',
    tokenEncryptionKey: Buffer.from(requireEnv('TOKEN_ENCRYPTION_KEY'), 'hex'),
    sessionCookieSecret: requireEnv('SESSION_COOKIE_SECRET'),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  };
  if (cached.tokenEncryptionKey.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  if (cached.sessionCookieSecret.length < 32) {
    throw new Error('SESSION_COOKIE_SECRET must be at least 32 characters long');
  }
  return cached;
}

export function resetConfigCacheForTests(): void {
  cached = undefined;
}
