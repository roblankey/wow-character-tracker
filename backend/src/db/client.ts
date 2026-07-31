import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type DbClient = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export function createDbClient(dbPath: string): DbClient {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

let cached: DbClient | undefined;

export function getDbClient(dbPath: string): DbClient {
  if (!cached) {
    cached = createDbClient(dbPath);
  }
  return cached;
}
