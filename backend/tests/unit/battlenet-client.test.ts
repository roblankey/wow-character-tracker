import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAccountCharacters,
  BlizzardApiError,
  fetchFullCharacterRoster,
} from '../../src/battlenet/client.js';
import { createTestConfig } from '../helpers/testApp.js';

const config = createTestConfig();

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('Blizzard API client rate-limit backoff', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retries after a 429 honoring the Retry-After header, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('rate limited', { status: 429, headers: { 'Retry-After': '1' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ wow_accounts: [] }));

    const promise = fetchAccountCharacters(config, 'access-token');
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated 429s and throws a BlizzardApiError', async () => {
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 429 }));

    const promise = fetchAccountCharacters(config, 'access-token');
    const assertion = expect(promise).rejects.toBeInstanceOf(BlizzardApiError);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('throws immediately on a non-429 error status without retrying', async () => {
    fetchMock.mockResolvedValue(new Response('server error', { status: 500 }));

    await expect(fetchAccountCharacters(config, 'access-token')).rejects.toBeInstanceOf(
      BlizzardApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('enriches each character with item level, spec, and professions', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/profile/user/wow')) {
        return Promise.resolve(
          jsonResponse({
            wow_accounts: [
              {
                characters: [
                  {
                    id: 1,
                    name: 'Thrallmar',
                    level: 80,
                    realm: { slug: 'area-52', name: 'Area 52' },
                    playable_class: { name: 'Warrior' },
                    playable_race: { name: 'Orc' },
                    faction: { type: 'HORDE' },
                  },
                ],
              },
            ],
          }),
        );
      }
      if (url.includes('/professions')) {
        return Promise.resolve(
          jsonResponse({
            primaries: [{ profession: { name: 'Blacksmithing' }, skill_points: 100 }],
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({ equipped_item_level: 489, active_spec: { name: 'Protection' } }),
      );
    });

    const [result] = await fetchFullCharacterRoster(config, 'access-token');

    expect(result).toMatchObject({
      name: 'Thrallmar',
      faction: 'Horde',
      itemLevel: 489,
      activeSpec: 'Protection',
      professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
    });
  });
});
