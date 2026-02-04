/**
 * Virtualized Text Renderer
 *
 * Uses react-window v2 to render only visible paragraphs.
 * Maintains selection state across scroll boundaries.
 */

import { useRef, useCallback, memo, useState } from "react";
import {
  List,
  type RowComponentProps,
  type ListImperativeAPI,
} from "react-window";
import type { Entity, EntityType, Paragraph, TextRange } from "./types";
import { ParagraphContent } from "./EntityOverlay";

interface VirtualizedTextProps {
  paragraphs: Paragraph[];
  entities: Entity[];
  entityTypes: EntityType[];
  selection: TextRange | null;
  selectedEntityId: string | null;
  height?: number;
  onSelectionStart: (offset: number) => void;
  onSelectionMove: (offset: number) => void;
  onSelectionEnd: () => void;
  onDoubleClick: (offset: number) => void;
  onShiftClick: (offset: number) => void;
  onEntityClick: (entity: Entity) => void;
}

// Estimate paragraph height based on text length and container width
function measureParagraph(text: string, width: number): number {
  const charsPerLine = Math.max(Math.floor(width / 8), 40);
  const lines = Math.ceil((text.length || 1) / charsPerLine);
  return Math.max(lines * 24 + 8, 32); // 24px line height + padding, min 32px
}

// Get character offset from mouse position within a paragraph
function getOffsetFromEvent(
  e: React.MouseEvent,
  paragraph: Paragraph,
  containerWidth: number,
): number {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Approximate character position
  const charsPerLine = Math.max(Math.floor(containerWidth / 8), 40);
  const lineIndex = Math.floor(y / 24);
  const charInLine = Math.floor(x / 8);
  const charIndex = lineIndex * charsPerLine + charInLine;

  return (
    paragraph.startOffset +
    Math.min(Math.max(charIndex, 0), paragraph.text.length)
  );
}

// Props passed to each row through rowProps
interface ParagraphRowProps {
  paragraphs: Paragraph[];
  entities: Entity[];
  entityTypes: EntityType[];
  selection: TextRange | null;
  selectedEntityId: string | null;
  containerWidth: number;
  onSelectionStart: (offset: number) => void;
  onSelectionMove: (offset: number) => void;
  onSelectionEnd: () => void;
  onDoubleClick: (offset: number) => void;
  onShiftClick: (offset: number) => void;
  onEntityClick: (entity: Entity) => void;
}

// Row component for react-window v2
function ParagraphRow({
  index,
  style,
  ...props
}: RowComponentProps<ParagraphRowProps>) {
  const {
    paragraphs,
    entities,
    entityTypes,
    selection,
    selectedEntityId,
    containerWidth,
    onSelectionStart,
    onSelectionMove,
    onSelectionEnd,
    onDoubleClick,
    onShiftClick,
    onEntityClick,
  } = props;

  const paragraph = paragraphs[index];
  if (!paragraph) return null;

  // Get entities for this paragraph
  const paragraphEntities = entities.filter(
    (e) => e.start < paragraph.endOffset && e.end > paragraph.startOffset,
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      const offset = getOffsetFromEvent(e, paragraph, containerWidth);
      onShiftClick(offset);
    } else {
      const offset = getOffsetFromEvent(e, paragraph, containerWidth);
      onSelectionStart(offset);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      const offset = getOffsetFromEvent(e, paragraph, containerWidth);
      onSelectionMove(offset);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const offset = getOffsetFromEvent(e, paragraph, containerWidth);
    onDoubleClick(offset);
  };

  return (
    <div
      style={style}
      className="px-2 py-1 select-none cursor-text"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={onSelectionEnd}
      onDoubleClick={handleDoubleClick}
    >
      <ParagraphContent
        paragraph={paragraph}
        entities={paragraphEntities}
        entityTypes={entityTypes}
        selection={selection}
        selectedEntityId={selectedEntityId}
        onEntityClick={onEntityClick}
      />
    </div>
  );
}

export const VirtualizedText = memo(function VirtualizedText({
  paragraphs,
  entities,
  entityTypes,
  selection,
  selectedEntityId,
  height = 400,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
  onDoubleClick,
  onShiftClick,
  onEntityClick,
}: VirtualizedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [_listRef, setListRef] = useState<ListImperativeAPI | null>(null);

  // Calculate row height
  const getRowHeight = useCallback(
    (index: number) => {
      const width = containerRef.current?.clientWidth ?? 600;
      return measureParagraph(paragraphs[index]?.text ?? "", width);
    },
    [paragraphs],
  );

  const containerWidth = containerRef.current?.clientWidth ?? 600;

  return (
    <div ref={containerRef} className="h-full w-full" style={{ height }}>
      <List<ParagraphRowProps>
        listRef={setListRef}
        rowCount={paragraphs.length}
        rowHeight={getRowHeight}
        overscanCount={5}
        rowComponent={ParagraphRow}
        rowProps={{
          paragraphs,
          entities,
          entityTypes,
          selection,
          selectedEntityId,
          containerWidth,
          onSelectionStart,
          onSelectionMove,
          onSelectionEnd,
          onDoubleClick,
          onShiftClick,
          onEntityClick,
        }}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
});
