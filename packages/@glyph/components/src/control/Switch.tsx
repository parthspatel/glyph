import React from 'react';

export interface CaseProps {
  value: string | number;
  children: React.ReactNode;
}

export interface SwitchProps {
  value: string | number;
  children: React.ReactElement<CaseProps>[];
  fallback?: React.ReactNode;
}

export function Switch({ value, children, fallback }: SwitchProps): React.ReactElement | null {
  const matchingCase = React.Children.toArray(children).find(
    (child) => React.isValidElement<CaseProps>(child) && child.props.value === value
  );

  if (matchingCase && React.isValidElement<CaseProps>(matchingCase)) {
    return <>{matchingCase.props.children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

export function Case({ children }: CaseProps): React.ReactElement {
  return <>{children}</>;
}
