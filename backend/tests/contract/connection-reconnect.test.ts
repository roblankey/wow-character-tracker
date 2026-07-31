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
import { battleNetConnection, character } from '../../src/db/schema.js';
import { buildTestApp } from '../helpers/testApp.js';

async function getIssuedState(app: ReturnType<typeof buildTestApp>['app']): Promise<string> {
  const authorizeResponse = await app.inject({ method: 'GET', url: '/api/connection/authorize' });
  const location = authorizeResponse.headers.location as string;
  return new URL(location, 'http://localhost').searchParams.get('state')!;
}

describe('GET /api/connection/callback (reconnect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces an existing connection instead of creating a duplicate (FR-010)', async () => {
    const { app, db } = buildTestApp();

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: 'access-1',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(fetchUserInfo).mockResolvedValue({ id: 'acct-1', battletag: 'First#1111' });

    await app.inject({
      method: 'GET',
      url: `/api/connection/callback?code=code1&state=${await getIssuedState(app)}`,
    });

    const [firstConnection] = await db.select().from(battleNetConnection);
    expect(firstConnection).toBeDefined();
    await db.insert(character).values({
      connectionId: firstConnection!.id,
      battlenetCharacterId: 'char-1',
      name: 'Oldtoon',
      realmSlug: 'area-52',
      realmName: 'Area 52',
      faction: 'Horde',
      class: 'Warrior',
      race: 'Orc',
      level: 80,
      itemLevel: 400,
      activeSpec: 'Fury',
      professions: '[]',
      updatedAt: new Date(),
    });

    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: 'access-2',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(fetchUserInfo).mockResolvedValue({ id: 'acct-2', battletag: 'Second#2222' });

    await app.inject({
      method: 'GET',
      url: `/api/connection/callback?code=code2&state=${await getIssuedState(app)}`,
    });

    const connections = await db.select().from(battleNetConnection);
    expect(connections).toHaveLength(1);
    expect(connections[0]?.battlenetAccountId).toBe('acct-2');

    // the old connection's characters must have been cascade-deleted, not orphaned
    const characters = await db.select().from(character);
    expect(characters).toHaveLength(0);
  });
});
