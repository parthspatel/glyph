/**
 * Selection Manager
 *
 * Character-offset based selection that survives virtualization boundaries.
 * The key insight is that selection state is tracked in character offsets,
 * not DOM ranges, so scrolling doesn't break the selection.
 */

import { useState, useCallback, useRef } from 'react';
import type { TextRange, SelectionState, Paragraph } from './types';

/**
 * Manages text as paragraphs with character offsets.
 * Enables virtualization where only visible paragraphs are in DOM.
 */
export class SelectionManager {
  private text: string;
  private paragraphs: Paragraph[];

  constructor(text: string) {
    this.text = text;
    this.paragraphs = this.splitIntoParagraphs(text);
  }

  private splitIntoParagraphs(text: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let offset = 0;
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      paragraphs.push({
        index: i,
        text: line,
        startOffset: offset,
        endOffset: offset + line.length,
      });
      offset += line.length + 1; // +1 for newline
    }

    return paragraphs;
  }

  getText(): string {
    return this.text;
  }

  getParagraphs(): Paragraph[] {
    return this.paragraphs;
  }

  getParagraphCount(): number {
    return this.paragraphs.length;
  }

  getParagraphAtIndex(index: number): Paragraph | undefined {
    return this.paragraphs[index];
  }

  getParagraphAtOffset(offset: number): Paragraph | undefined {
    return this.paragraphs.find(
      (p) => offset >= p.startOffset && offset <= p.endOffset
    );
  }

  /**
   * Get word boundaries at offset (for double-click selection).
   */
  getWordAt(offset: number): TextRange | null {
    const wordRegex = /\b[\w'-]+\b/g;
    let match;
    while ((match = wordRegex.exec(this.text)) !== null) {
      if (offset >= match.index && offset <= match.index + match[0].length) {
        return { start: match.index, end: match.index + match[0].length };
      }
    }
    return null;
  }

  /**
   * Extend selection from anchor to new offset (for shift-click).
   */
  extendSelection(anchor: number, newOffset: number): TextRange {
    return {
      start: Math.min(anchor, newOffset),
      end: Math.max(anchor, newOffset),
    };
  }

  /**
   * Get text for a range.
   */
  getTextForRange(range: TextRange): string {
    return this.text.slice(range.start, range.end);
  }
}

/**
 * React hook for managing selection state.
 */
export function useSelection(text: string) {
  const managerRef = useRef<SelectionManager | null>(null);

  // Create or update manager when text changes
  if (!managerRef.current || managerRef.current.getText() !== text) {
    managerRef.current = new SelectionManager(text);
  }

  const manager = managerRef.current;

  const [state, setState] = useState<SelectionState>({
    range: null,
    anchor: null,
    isSelecting: false,
  });

  const startSelection = useCallback((offset: number) => {
    setState({
      range: { start: offset, end: offset },
      anchor: offset,
      isSelecting: true,
    });
  }, []);

  const updateSelection = useCallback((offset: number) => {
    setState((prev) => {
      if (!prev.isSelecting || prev.anchor === null) return prev;
      return {
        ...prev,
        range: {
          start: Math.min(prev.anchor, offset),
          end: Math.max(prev.anchor, offset),
        },
      };
    });
  }, []);

  const endSelection = useCallback(() => {
    setState((prev) => ({ ...prev, isSelecting: false }));
  }, []);

  const selectWord = useCallback(
    (offset: number) => {
      const range = manager.getWordAt(offset);
      if (range) {
        setState({ range, anchor: range.start, isSelecting: false });
      }
    },
    [manager]
  );

  const extendTo = useCallback(
    (offset: number) => {
      setState((prev) => {
        const anchor = prev.anchor ?? offset;
        return {
          range: manager.extendSelection(anchor, offset),
          anchor,
          isSelecting: false,
        };
      });
    },
    [manager]
  );

  const clearSelection = useCallback(() => {
    setState({ range: null, anchor: null, isSelecting: false });
  }, []);

  return {
    ...state,
    manager,
    startSelection,
    updateSelection,
    endSelection,
    selectWord,
    extendTo,
    clearSelection,
  };
}
