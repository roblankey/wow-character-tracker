import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterTable } from '../../src/components/RosterTable.js';
import type { CharacterDto } from '../../src/api/client.js';

function makeCharacter(overrides: Partial<CharacterDto>): CharacterDto {
  return {
    id: 1,
    name: 'Zzz',
    realmName: 'Area 52',
    faction: 'Horde',
    class: 'Warrior',
    race: 'Orc',
    level: 80,
    itemLevel: 489,
    activeSpec: 'Protection',
    professions: [],
    isRemoved: false,
    updatedAt: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

function nameOrder(): string[] {
  const rows = screen.getAllByRole('row').slice(1); // skip header row
  return rows.map((row) => within(row).getAllByRole('cell')[0]!.textContent!);
}

describe('RosterTable sorting', () => {
  const characters = [
    makeCharacter({ id: 1, name: 'Zenith', level: 70, itemLevel: 400 }),
    makeCharacter({ id: 2, name: 'Amber', level: 80, itemLevel: 489 }),
    makeCharacter({ id: 3, name: 'Mid', level: 75, itemLevel: 450 }),
  ];

  it('defaults to sorting by name ascending', () => {
    render(<RosterTable characters={characters} />);

    expect(nameOrder()).toEqual(['Amber', 'Mid', 'Zenith']);
  });

  it('sorts by a numeric column ascending on first click', async () => {
    render(<RosterTable characters={characters} />);

    await userEvent.click(screen.getByRole('button', { name: /^Level/ }));

    expect(nameOrder()).toEqual(['Zenith', 'Mid', 'Amber']);
  });

  it('reverses direction when the same column is clicked again', async () => {
    render(<RosterTable characters={characters} />);

    // Name is already the default ascending sort, so one click reverses it.
    await userEvent.click(screen.getByRole('button', { name: /^Name/ }));

    expect(nameOrder()).toEqual(['Zenith', 'Mid', 'Amber']);
  });
});
