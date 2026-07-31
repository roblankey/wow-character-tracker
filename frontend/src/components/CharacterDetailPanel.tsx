import { useState } from 'react';
import type { CharacterDto } from '../api/client.js';

export interface CharacterDetailPanelProps {
  character: CharacterDto;
  onClose: () => void;
}

export function CharacterDetailPanel({ character, onClose }: CharacterDetailPanelProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = character.imageUrl !== null && !imageFailed;

  return (
    <aside className="character-detail-panel" aria-label={`${character.name} details`}>
      <div className="character-detail-panel-header">
        <h2>{character.name}</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {character.isRemoved ? <p className="character-detail-removed">Removed</p> : null}
      {showImage ? (
        <img
          src={character.imageUrl ?? undefined}
          alt={character.name}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <p>No image available</p>
      )}
      <table className="character-detail-table">
        <tbody>
          <tr>
            <th scope="row">Class</th>
            <td>{character.class}</td>
            <th scope="row">Race</th>
            <td>{character.race}</td>
          </tr>
          <tr>
            <th scope="row">Faction</th>
            <td>{character.faction}</td>
            <th scope="row">Realm</th>
            <td>{character.realmName}</td>
          </tr>
          <tr>
            <th scope="row">Level</th>
            <td>{character.level}</td>
            <th scope="row">Item Level</th>
            <td>{character.itemLevel}</td>
          </tr>
          <tr>
            <th scope="row">Spec</th>
            <td colSpan={3}>{character.activeSpec}</td>
          </tr>
          <tr>
            <th scope="row">Professions</th>
            <td colSpan={3}>
              {character.professions.length > 0
                ? character.professions.map((profession) => profession.name).join(', ')
                : 'No professions tracked.'}
            </td>
          </tr>
        </tbody>
      </table>
    </aside>
  );
}
