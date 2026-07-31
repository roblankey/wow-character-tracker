import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migrationsDir = fileURLToPath(new URL('../../src/db/migrations', import.meta.url));

function readMigration(fileName: string): string {
  return readFileSync(join(migrationsDir, fileName), 'utf8');
}

let tempDir: string;
let dbPath: string;
let db: Database.Database | undefined;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'wow-tracker-migration-test-'));
  dbPath = join(tempDir, 'test.sqlite');
});

afterEach(() => {
  db?.close();
  db = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('migration 0003 (session-scoped connections)', () => {
  it('clears any pre-existing connection/character rows (FR-007)', () => {
    db = new Database(dbPath);

    // Apply migrations 0000-0002 (feature 001/002's schema, pre-dating
    // session scoping) to reach the same starting point an upgrading
    // installation would be at.
    db.exec(readMigration('0000_black_stone_men.sql'));
    db.exec(readMigration('0001_melted_black_cat.sql'));
    db.exec(readMigration('0002_wooden_mandarin.sql'));

    // Seed a pre-existing connection and character the way feature 001/002
    // would have left one, with no session_id/battletag columns yet.
    db.exec(`
      INSERT INTO battlenet_connection
        (battlenet_account_id, region, access_token, token_expires_at, connected_at, last_sync_status)
      VALUES
        ('acct-1', 'us', 'enc-access', 0, 0, 'success');
    `);
    db.exec(`
      INSERT INTO character
        (connection_id, battlenet_character_id, name, realm_slug, realm_name, faction, class, race, level, item_level, active_spec, professions, updated_at)
      VALUES
        (1, 'char-1', 'Oldtoon', 'area-52', 'Area 52', 'Horde', 'Warrior', 'Orc', 80, 400, 'Fury', '[]', 0);
    `);

    expect(db.prepare('SELECT COUNT(*) AS c FROM battlenet_connection').get()).toEqual({ c: 1 });
    expect(db.prepare('SELECT COUNT(*) AS c FROM character').get()).toEqual({ c: 1 });

    db.exec(readMigration('0003_outstanding_avengers.sql'));

    expect(db.prepare('SELECT COUNT(*) AS c FROM battlenet_connection').get()).toEqual({ c: 0 });
    expect(db.prepare('SELECT COUNT(*) AS c FROM character').get()).toEqual({ c: 0 });

    // The new columns must now be usable (NOT NULL, no default needed on
    // the now-empty table).
    db.exec(`
      INSERT INTO battlenet_connection
        (session_id, battlenet_account_id, battletag, region, access_token, token_expires_at, connected_at, last_sync_status)
      VALUES
        ('session-1', 'acct-1', 'Tester#1234', 'us', 'enc-access', 0, 0, 'success');
    `);
    expect(db.prepare('SELECT COUNT(*) AS c FROM battlenet_connection').get()).toEqual({ c: 1 });

    expect(() =>
      db!.exec(`
        INSERT INTO battlenet_connection
          (session_id, battlenet_account_id, battletag, region, access_token, token_expires_at, connected_at, last_sync_status)
        VALUES
          ('session-1', 'acct-2', 'Other#5678', 'us', 'enc-access', 0, 0, 'success');
      `),
    ).toThrow(/UNIQUE constraint failed/);
  });
});
