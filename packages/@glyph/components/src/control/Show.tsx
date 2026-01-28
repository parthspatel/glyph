import React from 'react';

export interface ShowProps {
  when: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Show({ when, fallback, children }: ShowProps): React.ReactElement | null {
  if (when) {
    return <>{children}</>;
  }
  return fallback ? <>{fallback}</> : null;
}
