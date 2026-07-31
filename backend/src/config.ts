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
  };
  if (cached.tokenEncryptionKey.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return cached;
}

export function resetConfigCacheForTests(): void {
  cached = undefined;
}
