import { useState } from 'react';
import type { CharacterDto } from '../api/client.js';

export interface RosterTableProps {
  characters: CharacterDto[];
  onSelectCharacter?: (character: CharacterDto) => void;
}

type SortKey =
  'name' | 'class' | 'race' | 'faction' | 'realmName' | 'level' | 'itemLevel' | 'activeSpec';
type SortDirection = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'class', label: 'Class' },
  { key: 'race', label: 'Race' },
  { key: 'faction', label: 'Faction' },
  { key: 'realmName', label: 'Realm' },
  { key: 'level', label: 'Level' },
  { key: 'itemLevel', label: 'Item Level' },
  { key: 'activeSpec', label: 'Spec' },
];

function compare(a: CharacterDto, b: CharacterDto, key: SortKey): number {
  const aValue = a[key];
  const bValue = b[key];
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return aValue - bValue;
  }
  return String(aValue).localeCompare(String(bValue));
}

export function RosterTable({ characters, onSelectCharacter }: RosterTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedCharacters = [...characters].sort((a, b) => {
    const result = compare(a, b, sortKey);
    return sortDirection === 'asc' ? result : -result;
  });

  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const isActive = column.key === sortKey;
            return (
              <th
                key={column.key}
                aria-sort={
                  isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
                }
              >
                <button type="button" onClick={() => handleSort(column.key)}>
                  {column.label}
                  {isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedCharacters.map((c) => (
          <tr
            key={c.id}
            aria-label={c.name}
            data-removed={c.isRemoved}
            onClick={() => onSelectCharacter?.(c)}
          >
            <td>
              {c.name}
              {c.isRemoved ? ' (removed)' : ''}
            </td>
            <td>{c.class}</td>
            <td>{c.race}</td>
            <td>{c.faction}</td>
            <td>{c.realmName}</td>
            <td>{c.level}</td>
            <td>{c.itemLevel}</td>
            <td>{c.activeSpec}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
