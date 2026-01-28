import React from 'react';

export interface TextDisplayProps {
  text: string;
  highlights?: Array<{ start: number; end: number; color?: string }>;
  fontSize?: string;
  lineHeight?: number;
}

export function TextDisplay({
  text,
  highlights = [],
  fontSize = '1rem',
  lineHeight = 1.6,
}: TextDisplayProps): React.ReactElement {
  // Simple implementation - production would handle overlapping highlights
  return (
    <div
      className="text-display"
      style={{ fontSize, lineHeight }}
    >
      {text}
    </div>
  );
}
