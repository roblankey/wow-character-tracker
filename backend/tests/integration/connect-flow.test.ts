import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/battlenet/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/battlenet/oauth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
    fetchUserInfo: vi.fn(),
  };
});

vi.mock('../../src/battlenet/client.js', () => ({
  fetchFullCharacterRoster: vi.fn(),
}));

import { exchangeCodeForTokens, fetchUserInfo } from '../../src/battlenet/oauth.js';
import { fetchFullCharacterRoster } from '../../src/battlenet/client.js';
import { battleNetConnection, character } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

let tempDir: string;
let dbPath: string;
let currentDb: ReturnType<typeof buildTestApp>['db'] | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  tempDir = mkdtempSync(join(tmpdir(), 'wow-tracker-test-'));
  dbPath = join(tempDir, 'test.sqlite');
});

afterEach(() => {
  currentDb?.$client.close();
  currentDb = undefined;
  rmSync(tempDir, { recursive: true, force: true });
});

describe('connect flow (real temp SQLite file, stubbed Blizzard client)', () => {
  it('persists a BattleNetConnection and its Character rows', async () => {
    const { app, db } = buildTestApp(dbPath);
    currentDb = db;

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: 'access-1',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(fetchUserInfo).mockResolvedValue({ id: 'acct-1', battletag: 'Tester#1234' });
    vi.mocked(fetchFullCharacterRoster).mockResolvedValue([
      {
        battlenetCharacterId: 'char-1',
        name: 'Thrallmar',
        realmSlug: 'area-52',
        realmName: 'Area 52',
        faction: 'Horde',
        class: 'Warrior',
        race: 'Orc',
        level: 80,
        itemLevel: 489,
        activeSpec: 'Protection',
        professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
      },
    ]);

    const authorizeResponse = await app.inject({
      method: 'GET',
      url: '/api/connection/authorize',
    });
    const state = new URL(
      authorizeResponse.headers.location as string,
      'http://localhost',
    ).searchParams.get('state');

    const callbackResponse = await app.inject({
      method: 'GET',
      url: `/api/connection/callback?code=abc123&state=${state}`,
    });
    expect(callbackResponse.statusCode).toBe(302);

    const connections = await db.select().from(battleNetConnection);
    expect(connections).toHaveLength(1);
    expect(connections[0]?.lastSyncStatus).toBe('success');

    const characters = await db.select().from(character);
    expect(characters).toHaveLength(1);
    expect(characters[0]?.name).toBe('Thrallmar');
    expect(characters[0]?.itemLevel).toBe(489);
  });
});
