import type { CharacterDto } from '../api/client.js';
import { compareCharacters } from '../api/compare.js';

export interface ComparisonViewProps {
  characters: CharacterDto[];
}

export function ComparisonView({ characters }: ComparisonViewProps) {
  const result = compareCharacters(characters);

  return (
    <div>
      {!result.hasDifferences ? <p>No differences between the selected characters.</p> : null}
      <table>
        <thead>
          <tr>
            <th>Attribute</th>
            {characters.map((c) => (
              <th key={c.id}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.attributes.map((attr) => (
            <tr key={attr.key} data-differs={attr.differs}>
              <th scope="row">{attr.label}</th>
              {attr.values.map((v) => (
                <td key={v.characterId} className={attr.differs ? 'differs' : undefined}>
                  {v.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
