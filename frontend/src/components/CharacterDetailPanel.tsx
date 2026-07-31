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
      <dl>
        <dt>Class</dt>
        <dd>{character.class}</dd>
        <dt>Race</dt>
        <dd>{character.race}</dd>
        <dt>Faction</dt>
        <dd>{character.faction}</dd>
        <dt>Realm</dt>
        <dd>{character.realmName}</dd>
        <dt>Level</dt>
        <dd>{character.level}</dd>
        <dt>Item Level</dt>
        <dd>{character.itemLevel}</dd>
        <dt>Spec</dt>
        <dd>{character.activeSpec}</dd>
      </dl>
      <h3>Professions</h3>
      {character.professions.length > 0 ? (
        <ul>
          {character.professions.map((profession) => (
            <li key={profession.name}>
              {profession.name} ({profession.skillLevel})
            </li>
          ))}
        </ul>
      ) : (
        <p>No professions tracked.</p>
      )}
    </aside>
  );
}
