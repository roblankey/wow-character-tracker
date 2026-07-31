import { describe, expect, it } from 'vitest';
import { compareCharacters } from '../../src/api/compare.js';
import type { CharacterDto } from '../../src/api/client.js';

function makeCharacter(overrides: Partial<CharacterDto> = {}): CharacterDto {
  return {
    id: 1,
    name: 'Thrallmar',
    realmName: 'Area 52',
    faction: 'Horde',
    class: 'Warrior',
    race: 'Orc',
    level: 80,
    itemLevel: 489,
    activeSpec: 'Protection',
    professions: [{ name: 'Blacksmithing', skillLevel: 100 }],
    isRemoved: false,
    updatedAt: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

describe('compareCharacters', () => {
  it('flags attributes that differ between characters', () => {
    const a = makeCharacter({ id: 1, level: 80, itemLevel: 489 });
    const b = makeCharacter({ id: 2, level: 75, itemLevel: 420 });

    const result = compareCharacters([a, b]);

    expect(result.hasDifferences).toBe(true);
    const levelAttr = result.attributes.find((attr) => attr.key === 'level');
    expect(levelAttr?.differs).toBe(true);
    const itemLevelAttr = result.attributes.find((attr) => attr.key === 'itemLevel');
    expect(itemLevelAttr?.differs).toBe(true);
  });

  it('reports no differences when all tracked attributes match', () => {
    const a = makeCharacter({ id: 1 });
    const b = makeCharacter({ id: 2 });

    const result = compareCharacters([a, b]);

    expect(result.hasDifferences).toBe(false);
    expect(result.attributes.every((attr) => !attr.differs)).toBe(true);
  });

  it('treats professions as differing when the set of professions differs', () => {
    const a = makeCharacter({ id: 1, professions: [{ name: 'Mining', skillLevel: 100 }] });
    const b = makeCharacter({ id: 2, professions: [{ name: 'Herbalism', skillLevel: 100 }] });

    const result = compareCharacters([a, b]);

    const professionsAttr = result.attributes.find((attr) => attr.key === 'professions');
    expect(professionsAttr?.differs).toBe(true);
  });

  it('throws when fewer than two characters are given', () => {
    expect(() => compareCharacters([makeCharacter()])).toThrow();
  });
});
