import React from 'react';

export interface ForEachProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  empty?: React.ReactNode;
}

export function ForEach<T>({
  items,
  renderItem,
  keyExtractor,
  empty,
}: ForEachProps<T>): React.ReactElement {
  if (items.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor?.(item, index) ?? index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </>
  );
}
