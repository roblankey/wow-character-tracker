import type { CharacterDto } from '../api/client.js';

export interface RosterTableProps {
  characters: CharacterDto[];
}

export function RosterTable({ characters }: RosterTableProps) {
  return (
    <table>
      <thead>
        <tr>
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
