import React from 'react';

export interface BoxProps {
  padding?: string;
  margin?: string;
  border?: boolean;
  rounded?: boolean;
  children: React.ReactNode;
}

export function Box({
  padding = '1rem',
  margin,
  border = false,
  rounded = false,
  children,
}: BoxProps): React.ReactElement {
  return (
    <div
      className="box"
      style={{
        padding,
        margin,
        border: border ? '1px solid #e0e0e0' : undefined,
        borderRadius: rounded ? '8px' : undefined,
      }}
    >
      {children}
    </div>
  );
}
