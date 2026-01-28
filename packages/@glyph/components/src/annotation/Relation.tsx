import React from 'react';

export interface RelationData {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
}

export interface RelationProps {
  /** Available entities to link */
  entities: Array<{ id: string; label: string }>;
  /** Current relations */
  value: RelationData[];
  /** Callback when relations change */
  onChange: (relations: RelationData[]) => void;
  /** Available relation types */
  relationTypes: Array<{ id: string; label: string }>;
  /** Whether the component is read-only */
  readOnly?: boolean;
}

/**
 * Relation - Component for creating relationships between entities
 */
export function Relation({
  entities,
  value,
  onChange,
  relationTypes,
  readOnly = false,
}: RelationProps): React.ReactElement {
  const handleRemoveRelation = (relationId: string) => {
    if (readOnly) return;
    onChange(value.filter((r) => r.id !== relationId));
  };

  const getEntityLabel = (entityId: string): string => {
    return entities.find((e) => e.id === entityId)?.label ?? 'Unknown';
  };

  const getRelationLabel = (typeId: string): string => {
    return relationTypes.find((t) => t.id === typeId)?.label ?? typeId;
  };

  return (
    <div className="relation">
      <div className="relation__list">
        {value.length === 0 ? (
          <p className="relation__empty">No relations defined</p>
        ) : (
          value.map((relation) => (
            <div key={relation.id} className="relation__item">
              <span className="relation__source">
                {getEntityLabel(relation.sourceId)}
              </span>
              <span className="relation__type">
                → {getRelationLabel(relation.type)} →
              </span>
              <span className="relation__target">
                {getEntityLabel(relation.targetId)}
              </span>
              {!readOnly && (
                <button
                  className="relation__remove"
                  onClick={() => handleRemoveRelation(relation.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!readOnly && entities.length >= 2 && (
        <p className="relation__hint">
          Select two entities to create a relation between them.
        </p>
      )}
    </div>
  );
}
