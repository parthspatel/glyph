import React, { useState, useCallback } from 'react';

export interface EntityType {
  id: string;
  label: string;
  color: string;
  shortcut?: string;
}

export interface Entity {
  id: string;
  type: string;
  start: number;
  end: number;
  text: string;
}

export interface NERTaggerProps {
  /** The text to annotate */
  text: string;
  /** Available entity types */
  entityTypes: EntityType[];
  /** Current entities */
  value: Entity[];
  /** Callback when entities change */
  onChange: (entities: Entity[]) => void;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** AI-suggested entities */
  suggestions?: Entity[];
  /** Callback when a suggestion is accepted */
  onAcceptSuggestion?: (entity: Entity) => void;
}

/**
 * NERTagger - Named Entity Recognition tagging component
 *
 * Allows users to select text spans and assign entity types.
 */
export function NERTagger({
  text,
  entityTypes,
  value,
  onChange,
  readOnly = false,
  suggestions = [],
  onAcceptSuggestion,
}: NERTaggerProps): React.ReactElement {
  const [selectedType, setSelectedType] = useState<string | null>(
    entityTypes[0]?.id ?? null
  );

  const handleTextSelection = useCallback(() => {
    if (readOnly || !selectedType) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (selectedText.trim()) {
      const newEntity: Entity = {
        id: `entity-${Date.now()}`,
        type: selectedType,
        start: range.startOffset,
        end: range.endOffset,
        text: selectedText,
      };

      onChange([...value, newEntity]);
      selection.removeAllRanges();
    }
  }, [readOnly, selectedType, value, onChange]);

  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      if (readOnly) return;
      onChange(value.filter((e) => e.id !== entityId));
    },
    [readOnly, value, onChange]
  );

  return (
    <div className="ner-tagger">
      {/* Entity type selector */}
      <div className="ner-tagger__types">
        {entityTypes.map((type) => (
          <button
            key={type.id}
            className={`ner-tagger__type ${selectedType === type.id ? 'ner-tagger__type--selected' : ''}`}
            style={{ backgroundColor: type.color }}
            onClick={() => setSelectedType(type.id)}
            disabled={readOnly}
          >
            {type.label}
            {type.shortcut && <kbd>{type.shortcut}</kbd>}
          </button>
        ))}
      </div>

      {/* Text with annotations */}
      <div
        className="ner-tagger__text"
        onMouseUp={handleTextSelection}
      >
        {text}
      </div>

      {/* Entity list */}
      <div className="ner-tagger__entities">
        {value.map((entity) => {
          const entityType = entityTypes.find((t) => t.id === entity.type);
          return (
            <span
              key={entity.id}
              className="ner-tagger__entity"
              style={{ backgroundColor: entityType?.color }}
            >
              {entity.text} ({entityType?.label})
              {!readOnly && (
                <button
                  className="ner-tagger__remove"
                  onClick={() => handleRemoveEntity(entity.id)}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && onAcceptSuggestion && (
        <div className="ner-tagger__suggestions">
          <h4>Suggestions</h4>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className="ner-tagger__suggestion"
              onClick={() => onAcceptSuggestion(suggestion)}
            >
              Accept: {suggestion.text} ({suggestion.type})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
