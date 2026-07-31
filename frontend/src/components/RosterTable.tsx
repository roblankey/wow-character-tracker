import type { CharacterDto } from '../api/client.js';

export interface RosterTableProps {
  characters: CharacterDto[];
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}

export function RosterTable({ characters, selectedIds, onToggleSelect }: RosterTableProps) {
  const selectable = Boolean(onToggleSelect);

  return (
    <table>
      <thead>
        <tr>
          {selectable ? <th>Compare</th> : null}
          <th>Name</th>
          <th>Class</th>
          <th>Race</th>
          <th>Faction</th>
          <th>Realm</th>
          <th>Level</th>
          <th>Item Level</th>
          <th>Spec</th>
          <th>Professions</th>
        </tr>
      </thead>
      <tbody>
        {characters.map((c) => (
          <tr key={c.id} aria-label={c.name} data-removed={c.isRemoved}>
            {selectable ? (
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${c.name} for comparison`}
                  checked={selectedIds?.has(c.id) ?? false}
                  onChange={() => onToggleSelect?.(c.id)}
                />
              </td>
            ) : null}
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
            <td>{c.professions.map((p) => `${p.name} (${p.skillLevel})`).join(', ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
