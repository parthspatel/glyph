/**
 * NERTagger - Named Entity Recognition Component
 *
 * A virtualized text annotation component for entity tagging.
 * Supports:
 * - Virtualized rendering for large documents (50+ pages)
 * - Rich selection (click-drag, double-click word, shift-click extend)
 * - Character offsets that survive scroll boundaries
 * - Keyboard shortcuts for entity types
 * - AI suggestions with accept/reject
 */

import { useState, useCallback, useEffect } from 'react';
import { VirtualizedText } from './VirtualizedText';
import { useSelection } from './SelectionManager';
import type { Entity, EntityType } from './types';

export interface NERTaggerProps {
  /** The text to annotate */
  text: string;
  /** Available entity types with colors and shortcuts */
  entityTypes: EntityType[];
  /** Current entities */
  value: Entity[];
  /** Callback when entities change */
  onChange: (entities: Entity[]) => void;
  /** Read-only mode */
  readOnly?: boolean;
  /** AI-suggested entities */
  suggestions?: Entity[];
  /** Callback when suggestion is accepted */
  onAcceptSuggestion?: (entity: Entity) => void;
  /** Allow overlapping entities */
  allowOverlapping?: boolean;
  /** Enable keyboard shortcuts */
  enableHotkeys?: boolean;
  /** Height of the text area */
  height?: number;
  /** Custom shortcuts */
  shortcuts?: {
    addEntity?: string;
    deleteEntity?: string;
    cycleLabel?: string;
  };
}

export function NERTagger({
  text,
  entityTypes,
  value,
  onChange,
  readOnly = false,
  suggestions = [],
  onAcceptSuggestion,
  allowOverlapping = false,
  enableHotkeys = true,
  height = 400,
  shortcuts,
}: NERTaggerProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeEntityType, setActiveEntityType] = useState<string>(
    entityTypes[0]?.id ?? ''
  );

  const selection = useSelection(text);

  // Add entity from selection
  const addEntity = useCallback(() => {
    if (readOnly || !selection.range) return;

    const { start, end } = selection.range;
    if (start === end) return;

    // Check for overlaps
    if (!allowOverlapping) {
      const overlaps = value.some((e) => start < e.end && end > e.start);
      if (overlaps) return;
    }

    const newEntity: Entity = {
      id: crypto.randomUUID(),
      type: activeEntityType,
      start,
      end,
      text: text.slice(start, end),
    };

    onChange([...value, newEntity]);
    selection.clearSelection();
  }, [
    readOnly,
    selection,
    allowOverlapping,
    activeEntityType,
    value,
    onChange,
    text,
  ]);

  // Delete selected entity
  const deleteEntity = useCallback(() => {
    if (readOnly || !selectedEntityId) return;
    onChange(value.filter((e) => e.id !== selectedEntityId));
    setSelectedEntityId(null);
  }, [readOnly, selectedEntityId, value, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableHotkeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Add entity with 'e' or custom shortcut
      if (
        e.key === (shortcuts?.addEntity ?? 'e') &&
        selection.range &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        addEntity();
        return;
      }

      // Delete entity with Backspace/Delete
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        selectedEntityId &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        deleteEntity();
        return;
      }

      // Entity type shortcuts (1-9 or custom)
      entityTypes.forEach((type, index) => {
        const shortcut = type.shortcut ?? (index < 9 ? String(index + 1) : null);
        if (shortcut && e.key === shortcut && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setActiveEntityType(type.id);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enableHotkeys,
    shortcuts,
    selection.range,
    selectedEntityId,
    addEntity,
    deleteEntity,
    entityTypes,
  ]);

  // Auto-add entity when selection completes
  const handleSelectionEnd = useCallback(() => {
    selection.endSelection();
  }, [selection]);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Entity type selector */}
      <div className="flex gap-2 p-2 border-b bg-muted/50 flex-wrap">
        {entityTypes.map((type, index) => {
          const shortcut = type.shortcut ?? (index < 9 ? String(index + 1) : null);
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setActiveEntityType(type.id)}
              disabled={readOnly}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${activeEntityType === type.id ? 'ring-2 ring-primary ring-offset-1' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={{
                backgroundColor: `${type.color}30`,
                borderBottom: `2px solid ${type.color}`,
              }}
            >
              {type.label}
              {shortcut && enableHotkeys && (
                <kbd className="ml-2 px-1 py-0.5 text-xs rounded bg-background/50">
                  {shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>

      {/* Virtualized text area */}
      <div className="flex-1 overflow-hidden">
        <VirtualizedText
          paragraphs={selection.manager.getParagraphs()}
          entities={value}
          entityTypes={entityTypes}
          selection={selection.range}
          selectedEntityId={selectedEntityId}
          height={height}
          onSelectionStart={selection.startSelection}
          onSelectionMove={selection.updateSelection}
          onSelectionEnd={handleSelectionEnd}
          onDoubleClick={selection.selectWord}
          onShiftClick={selection.extendTo}
          onEntityClick={(e) => setSelectedEntityId(e.id)}
        />
      </div>

      {/* Action buttons */}
      {selection.range && selection.range.start !== selection.range.end && !readOnly && (
        <div className="p-2 border-t bg-muted/50 flex gap-2">
          <button
            type="button"
            onClick={addEntity}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add {entityTypes.find((t) => t.id === activeEntityType)?.label ?? 'Entity'}
            {enableHotkeys && <kbd className="ml-2 opacity-70">e</kbd>}
          </button>
          <button
            type="button"
            onClick={selection.clearSelection}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Selected entity actions */}
      {selectedEntityId && !readOnly && (
        <div className="p-2 border-t bg-muted/50 flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">
            Selected: {value.find((e) => e.id === selectedEntityId)?.text}
          </span>
          <button
            type="button"
            onClick={deleteEntity}
            className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
          >
            Delete
            {enableHotkeys && <kbd className="ml-2 opacity-70">⌫</kbd>}
          </button>
          <button
            type="button"
            onClick={() => setSelectedEntityId(null)}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md"
          >
            Deselect
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && onAcceptSuggestion && (
        <div className="p-2 border-t bg-accent/30">
          <p className="text-xs text-muted-foreground mb-2">AI Suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.slice(0, 5).map((s) => {
              const type = entityTypes.find((t) => t.id === s.type);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onAcceptSuggestion(s)}
                  className="text-xs px-2 py-1 rounded-md hover:ring-2 ring-primary transition-all"
                  style={{
                    backgroundColor: `${type?.color ?? '#888'}20`,
                    borderLeft: `3px solid ${type?.color ?? '#888'}`,
                  }}
                >
                  {s.text}{' '}
                  <span className="opacity-70">({type?.label ?? s.type})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export types
export type { Entity, EntityType } from './types';
