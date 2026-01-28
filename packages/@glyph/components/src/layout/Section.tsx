import React from 'react';

export interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Section({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: SectionProps): React.ReactElement {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <section className="section">
      {(title || collapsible) && (
        <header className="section__header">
          {title && <h2 className="section__title">{title}</h2>}
          {collapsible && (
            <button
              className="section__toggle"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
        </header>
      )}
      {description && <p className="section__description">{description}</p>}
      {!collapsed && <div className="section__content">{children}</div>}
    </section>
  );
}
