/**
 * Entity Overlay
 *
 * Renders text with entity highlights and selection overlays.
 * Handles the visual representation of annotations on text.
 */

import { useMemo, memo } from 'react';
import type { Entity, EntityType, Paragraph, TextRange } from './types';

interface ParagraphContentProps {
  paragraph: Paragraph;
  entities: Entity[];
  entityTypes: EntityType[];
  selection: TextRange | null;
  selectedEntityId: string | null;
  onEntityClick: (entity: Entity) => void;
}

interface Segment {
  type: 'text' | 'selection' | 'entity';
  text: string;
  entity?: Entity;
}

/**
 * Build text segments with entity and selection highlights.
 */
function buildSegments(
  paragraph: Paragraph,
  entities: Entity[],
  selection: TextRange | null
): Segment[] {
  const { text, startOffset } = paragraph;
  if (!text) return [{ type: 'text', text: '' }];

  // Collect all boundaries
  const boundaries: Array<{
    offset: number;
    type: 'start' | 'end';
    kind: 'entity' | 'selection';
    entity?: Entity;
  }> = [];

  for (const entity of entities) {
    const localStart = Math.max(0, entity.start - startOffset);
    const localEnd = Math.min(text.length, entity.end - startOffset);
    if (localStart < localEnd) {
      boundaries.push({ offset: localStart, type: 'start', kind: 'entity', entity });
      boundaries.push({ offset: localEnd, type: 'end', kind: 'entity', entity });
    }
  }

  if (selection) {
    const localStart = Math.max(0, selection.start - startOffset);
    const localEnd = Math.min(text.length, selection.end - startOffset);
    if (localStart < localEnd) {
      boundaries.push({ offset: localStart, type: 'start', kind: 'selection' });
      boundaries.push({ offset: localEnd, type: 'end', kind: 'selection' });
    }
  }

  // Sort by offset, then starts before ends
  boundaries.sort((a, b) => a.offset - b.offset || (a.type === 'start' ? -1 : 1));

  // Build segments
  const segments: Segment[] = [];
  let pos = 0;
  let activeEntity: Entity | null = null;
  let inSelection = false;

  for (const boundary of boundaries) {
    if (boundary.offset > pos) {
      const segmentText = text.slice(pos, boundary.offset);
      if (activeEntity) {
        segments.push({ type: 'entity', text: segmentText, entity: activeEntity });
      } else if (inSelection) {
        segments.push({ type: 'selection', text: segmentText });
      } else {
        segments.push({ type: 'text', text: segmentText });
      }
    }

    if (boundary.kind === 'entity') {
      activeEntity = boundary.type === 'start' ? boundary.entity! : null;
    } else {
      inSelection = boundary.type === 'start';
    }

    pos = boundary.offset;
  }

  // Remaining text
  if (pos < text.length) {
    if (activeEntity) {
      segments.push({ type: 'entity', text: text.slice(pos), entity: activeEntity });
    } else if (inSelection) {
      segments.push({ type: 'selection', text: text.slice(pos) });
    } else {
      segments.push({ type: 'text', text: text.slice(pos) });
    }
  }

  // If no segments, add empty text segment
  if (segments.length === 0) {
    segments.push({ type: 'text', text: text || '\u00A0' }); // Non-breaking space for empty lines
  }

  return segments;
}

export const ParagraphContent = memo(function ParagraphContent({
  paragraph,
  entities,
  entityTypes,
  selection,
  selectedEntityId,
  onEntityClick,
}: ParagraphContentProps) {
  const segments = useMemo(
    () => buildSegments(paragraph, entities, selection),
    [paragraph, entities, selection]
  );

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return <span key={i}>{segment.text}</span>;
        }

        if (segment.type === 'selection') {
          return (
            <span key={i} className="bg-primary/30 rounded-sm">
              {segment.text}
            </span>
          );
        }

        if (segment.type === 'entity' && segment.entity) {
          const entityType = entityTypes.find((t) => t.id === segment.entity!.type);
          const isSelected = segment.entity.id === selectedEntityId;

          return (
            <span
              key={i}
              className={`
                relative cursor-pointer rounded px-0.5
                ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
              `}
              style={{
                backgroundColor: `${entityType?.color ?? '#888'}40`,
                borderBottom: `2px solid ${entityType?.color ?? '#888'}`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEntityClick(segment.entity!);
              }}
              title={`${entityType?.label ?? segment.entity.type}: ${segment.entity.text}`}
            >
              {segment.text}
            </span>
          );
        }

        return null;
      })}
    </span>
  );
});
