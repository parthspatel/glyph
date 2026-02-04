/**
 * NERTagger Types
 *
 * Core types for the Named Entity Recognition tagger component.
 * Uses character offsets (not DOM ranges) for virtualization compatibility.
 */

export interface Entity {
  id: string;
  type: string;
  start: number; // Character offset
  end: number; // Character offset
  text: string;
}

export interface EntityType {
  id: string;
  label: string;
  color: string;
  shortcut?: string;
}

export interface TextRange {
  start: number;
  end: number;
}

export interface Paragraph {
  index: number;
  text: string;
  startOffset: number; // Character offset of paragraph start in full text
  endOffset: number; // Character offset of paragraph end in full text
}

export interface SelectionState {
  range: TextRange | null;
  anchor: number | null; // For shift-click extending
  isSelecting: boolean;
}
