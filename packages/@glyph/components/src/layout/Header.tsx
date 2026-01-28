import React from 'react';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  actions,
}: HeaderProps): React.ReactElement {
  return (
    <header className="header">
      <div className="header__text">
        <h1 className="header__title">{title}</h1>
        {subtitle && <p className="header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="header__actions">{actions}</div>}
    </header>
  );
}
