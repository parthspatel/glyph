import React from 'react';

export interface GridProps {
  columns?: number | string;
  gap?: string;
  children: React.ReactNode;
}

export function Grid({
  columns = 2,
  gap = '1rem',
  children,
}: GridProps): React.ReactElement {
  const gridTemplateColumns = typeof columns === 'number'
    ? `repeat(${columns}, 1fr)`
    : columns;

  return (
    <div
      className="grid"
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap,
      }}
    >
      {children}
    </div>
  );
}
