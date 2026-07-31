import type { CharacterDto } from './client.js';

export interface ComparisonAttribute {
  key: 'level' | 'itemLevel' | 'activeSpec' | 'professions';
  label: string;
  values: { characterId: number; value: string }[];
  differs: boolean;
}

export interface ComparisonResult {
  attributes: ComparisonAttribute[];
  hasDifferences: boolean;
}

function professionsToString(character: CharacterDto): string {
  return [...character.professions]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `${p.name} (${p.skillLevel})`)
    .join(', ');
}

const ATTRIBUTE_DEFINITIONS: {
  key: ComparisonAttribute['key'];
  label: string;
  getValue: (character: CharacterDto) => string;
}[] = [
  { key: 'level', label: 'Level', getValue: (c) => String(c.level) },
  { key: 'itemLevel', label: 'Item Level', getValue: (c) => String(c.itemLevel) },
  { key: 'activeSpec', label: 'Spec', getValue: (c) => c.activeSpec },
  {
    key: 'professions',
    label: 'Professions',
    getValue: (c) => professionsToString(c) || '—',
  },
];

/**
 * Computes a per-attribute comparison across two or more characters.
 * This is derived on demand from already-fetched roster data (see
 * data-model.md's "Comparison" concept) — nothing here is persisted.
 */
export function compareCharacters(characters: CharacterDto[]): ComparisonResult {
  if (characters.length < 2) {
    throw new Error('compareCharacters requires at least two characters');
  }

  const attributes: ComparisonAttribute[] = ATTRIBUTE_DEFINITIONS.map((def) => {
    const values = characters.map((c) => ({
      characterId: c.id,
      value: def.getValue(c),
    }));
    const differs = values.some((v) => v.value !== values[0]?.value);
    return { key: def.key, label: def.label, values, differs };
  });

  return {
    attributes,
    hasDifferences: attributes.some((attr) => attr.differs),
  };
}
