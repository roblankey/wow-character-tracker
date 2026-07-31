import type { Config } from '../config.js';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export class BlizzardApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BlizzardApiError';
  }
}

function apiHost(region: string): string {
  return `https://${region}.api.blizzard.com`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a Blizzard API URL, retrying on HTTP 429 with exponential backoff.
 * Honors the Retry-After header (seconds) when present so refresh/connect
 * calls degrade gracefully instead of failing hard under rate limits.
 */
async function blizzardFetch(url: string, accessToken: string): Promise<unknown> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (cause) {
      throw new BlizzardApiError(`Failed to reach Blizzard API: ${String(cause)}`);
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(retryAfterMs);
      continue;
    }

    if (!response.ok) {
      throw new BlizzardApiError(
        `Blizzard API request to ${url} failed with status ${response.status}`,
        response.status,
      );
    }

    return response.json();
  }

  throw new BlizzardApiError(
    `Blizzard API request to ${url} failed after ${MAX_RETRIES} retries due to rate limiting`,
  );
}

interface AccountProfileCharacter {
  id: number;
  name: string;
  level: number;
  realm: { slug: string; name: string };
  playable_class: { name: string };
  playable_race: { name: string };
  faction: { type: 'ALLIANCE' | 'HORDE' };
}

interface AccountProfileResponse {
  wow_accounts?: { characters: AccountProfileCharacter[] }[];
}

interface CharacterSummaryResponse {
  equipped_item_level?: number;
  active_spec?: { name: string };
}

interface ProfessionEntry {
  profession: { name: string };
  skill_points?: number;
}

interface CharacterProfessionsResponse {
  primaries?: ProfessionEntry[];
  secondaries?: ProfessionEntry[];
}

export interface FetchedCharacter {
  battlenetCharacterId: string;
  name: string;
  realmSlug: string;
  realmName: string;
  faction: 'Alliance' | 'Horde';
  class: string;
  race: string;
  level: number;
  itemLevel: number;
  activeSpec: string;
  professions: { name: string; skillLevel: number }[];
}

export async function fetchAccountCharacters(
  config: Config,
  accessToken: string,
): Promise<AccountProfileCharacter[]> {
  const url = `${apiHost(config.battlenet.region)}/profile/user/wow?namespace=profile-${config.battlenet.region}&locale=en_US`;
  const body = (await blizzardFetch(url, accessToken)) as AccountProfileResponse;
  return (body.wow_accounts ?? []).flatMap((account) => account.characters);
}

async function fetchCharacterSummary(
  config: Config,
  accessToken: string,
  realmSlug: string,
  characterName: string,
): Promise<CharacterSummaryResponse> {
  const url = `${apiHost(config.battlenet.region)}/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}?namespace=profile-${config.battlenet.region}&locale=en_US`;
  return (await blizzardFetch(url, accessToken)) as CharacterSummaryResponse;
}

async function fetchCharacterProfessions(
  config: Config,
  accessToken: string,
  realmSlug: string,
  characterName: string,
): Promise<{ name: string; skillLevel: number }[]> {
  const url = `${apiHost(config.battlenet.region)}/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/professions?namespace=profile-${config.battlenet.region}&locale=en_US`;
  const body = (await blizzardFetch(url, accessToken)) as CharacterProfessionsResponse;
  return [...(body.primaries ?? []), ...(body.secondaries ?? [])].map((entry) => ({
    name: entry.profession.name,
    skillLevel: entry.skill_points ?? 0,
  }));
}

/**
 * Fetches the connected account's full WoW roster, enriching each character
 * with item level, active spec, and professions. Each character requires two
 * additional per-character API calls, so this is the main place rate limits
 * are hit; blizzardFetch's backoff keeps a large roster from failing outright.
 */
export async function fetchFullCharacterRoster(
  config: Config,
  accessToken: string,
): Promise<FetchedCharacter[]> {
  const characters = await fetchAccountCharacters(config, accessToken);

  const results: FetchedCharacter[] = [];
  for (const char of characters) {
    const [summary, professions] = await Promise.all([
      fetchCharacterSummary(config, accessToken, char.realm.slug, char.name),
      fetchCharacterProfessions(config, accessToken, char.realm.slug, char.name),
    ]);

    results.push({
      battlenetCharacterId: String(char.id),
      name: char.name,
      realmSlug: char.realm.slug,
      realmName: char.realm.name,
      faction: char.faction.type === 'ALLIANCE' ? 'Alliance' : 'Horde',
      class: char.playable_class.name,
      race: char.playable_race.name,
      level: char.level,
      itemLevel: summary.equipped_item_level ?? 0,
      activeSpec: summary.active_spec?.name ?? 'Unknown',
      professions,
    });
  }

  return results;
}
