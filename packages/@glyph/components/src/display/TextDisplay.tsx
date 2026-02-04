import React from "react";

export interface TextDisplayProps {
  text: string;
  highlights?: Array<{ start: number; end: number; color?: string }>;
  fontSize?: string;
  lineHeight?: number;
}

export function TextDisplay({
  text,
  highlights = [],
  fontSize = "1rem",
  lineHeight = 1.6,
}: TextDisplayProps): React.ReactElement {
  // If no highlights, render plain text
  if (highlights.length === 0) {
    return (
      <div
        className="text-display whitespace-pre-wrap"
        style={{ fontSize, lineHeight }}
      >
        {text}
      </div>
    );
  }

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  // Build segments with highlights
  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedHighlights.forEach((highlight, i) => {
    // Add text before highlight
    if (highlight.start > lastEnd) {
      segments.push(
        <span key={`text-${i}`}>{text.slice(lastEnd, highlight.start)}</span>,
      );
    }
    // Add highlighted text
    segments.push(
      <mark
        key={`hl-${i}`}
        style={{ backgroundColor: highlight.color || "yellow" }}
        className="rounded px-0.5"
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>,
    );
    lastEnd = highlight.end;
  });

  // Add remaining text
  if (lastEnd < text.length) {
    segments.push(<span key="text-end">{text.slice(lastEnd)}</span>);
  }

  return (
    <div
      className="text-display whitespace-pre-wrap"
      style={{ fontSize, lineHeight }}
    >
      {segments}
    </div>
  );
}
