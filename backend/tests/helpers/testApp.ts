import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDbClient, type DbClient } from '../../src/db/client.js';
import type { Config } from '../../src/config.js';
import { buildApp } from '../../src/server.js';

export function createTestConfig(overrides: Partial<Config['battlenet']> = {}): Config {
  return {
    port: 0,
    dbPath: ':memory:',
    tokenEncryptionKey: Buffer.alloc(32, 7),
    frontendUrl: 'http://localhost:5173',
    battlenet: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3001/api/connection/callback',
      region: 'us',
      ...overrides,
    },
  };
}

export function createTestDb(dbPath: string = ':memory:'): DbClient {
  const db = createDbClient(dbPath);
  migrate(db, { migrationsFolder: './src/db/migrations' });
  return db;
}

export function buildTestApp(dbPath: string = ':memory:') {
  const db = createTestDb(dbPath);
  const config = createTestConfig();
  const app = buildApp({ db, config });
  return { app, db, config };
}
