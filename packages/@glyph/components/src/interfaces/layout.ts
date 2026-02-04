/**
 * Layout component interfaces.
 * These define the WASM-compatible API for layout primitives.
 */

import type { ComponentInterface, JsonObject } from "./common";

// ============================================================================
// Section Interface
// ============================================================================

export interface SectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Allow collapsing */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
  /** Border style */
  border?: "none" | "top" | "bottom" | "all";
}

export interface SectionCallbacks {
  /** Called when section expands/collapses */
  onExpandChange?: (expanded: boolean) => void;
}

export const SectionInterface: ComponentInterface<
  SectionProps,
  SectionCallbacks
> = {
  meta: {
    name: "Section",
    version: "1.0.0",
    category: "layout",
    description: "Collapsible content section",
    tier: 1,
  },
  props: {} as SectionProps,
  callbacks: {} as SectionCallbacks,
  slots: {
    header: { type: "component", content: "" },
    content: { type: "component", content: "" },
    footer: { type: "component", content: "" },
  },
  defaultProps: {
    collapsible: false,
    defaultExpanded: true,
    padding: "md",
    border: "none",
  },
};

// ============================================================================
// Grid Interface
// ============================================================================

export interface GridProps {
  /** Number of columns */
  columns?: number | "auto";
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  /** Minimum child width for auto columns */
  minChildWidth?: string;
  /** Align items vertically */
  alignItems?: "start" | "center" | "end" | "stretch";
  /** Justify items horizontally */
  justifyItems?: "start" | "center" | "end" | "stretch";
  /** Custom class name */
  className?: string;
}

export const GridInterface: ComponentInterface<GridProps, JsonObject> = {
  meta: {
    name: "Grid",
    version: "1.0.0",
    category: "layout",
    description: "CSS Grid-based layout container",
    tier: 1,
  },
  props: {} as GridProps,
  callbacks: {},
  slots: {
    children: { type: "component", content: "" },
  },
  defaultProps: {
    columns: "auto",
    gap: "md",
    alignItems: "stretch",
    justifyItems: "stretch",
  },
};

// ============================================================================
// Box Interface
// ============================================================================

export interface BoxProps {
  /** Padding */
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  /** Margin */
  margin?: "none" | "sm" | "md" | "lg" | "xl";
  /** Border */
  border?: "none" | "default" | "strong";
  /** Border radius */
  borderRadius?: "none" | "sm" | "md" | "lg" | "full";
  /** Background style */
  background?: "transparent" | "muted" | "card" | "accent";
  /** Shadow */
  shadow?: "none" | "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

export const BoxInterface: ComponentInterface<BoxProps, JsonObject> = {
  meta: {
    name: "Box",
    version: "1.0.0",
    category: "layout",
    description: "Flexible box container with styling options",
    tier: 1,
  },
  props: {} as BoxProps,
  callbacks: {},
  slots: {
    children: { type: "component", content: "" },
  },
  defaultProps: {
    padding: "none",
    margin: "none",
    border: "none",
    borderRadius: "none",
    background: "transparent",
    shadow: "none",
  },
};

// ============================================================================
// Column Interface
// ============================================================================

export interface ColumnProps {
  /** Column span (1-12) */
  span?: number;
  /** Column offset (0-11) */
  offset?: number;
  /** Responsive spans: { sm: 12, md: 6, lg: 4 } */
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Custom class name */
  className?: string;
}

export const ColumnInterface: ComponentInterface<ColumnProps, JsonObject> = {
  meta: {
    name: "Column",
    version: "1.0.0",
    category: "layout",
    description: "Grid column for responsive layouts",
    tier: 1,
  },
  props: {} as ColumnProps,
  callbacks: {},
  slots: {
    children: { type: "component", content: "" },
  },
  defaultProps: {
    span: 12,
    offset: 0,
  },
};

// ============================================================================
// Header Interface
// ============================================================================

export interface HeaderProps {
  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Heading text */
  text: string;
  /** Subtitle text */
  subtitle?: string;
  /** Custom class name */
  className?: string;
}

export const HeaderInterface: ComponentInterface<HeaderProps, JsonObject> = {
  meta: {
    name: "Header",
    version: "1.0.0",
    category: "layout",
    description: "Heading component with optional subtitle",
    tier: 1,
  },
  props: {} as HeaderProps,
  callbacks: {},
  defaultProps: {
    level: 2,
    text: "",
  },
};

// ============================================================================
// Divider Interface
// ============================================================================

export interface DividerProps {
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Label text */
  label?: string;
  /** Spacing around divider */
  spacing?: "none" | "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

export const DividerInterface: ComponentInterface<DividerProps, JsonObject> = {
  meta: {
    name: "Divider",
    version: "1.0.0",
    category: "layout",
    description: "Visual divider between content sections",
    tier: 1,
  },
  props: {} as DividerProps,
  callbacks: {},
  defaultProps: {
    orientation: "horizontal",
    spacing: "md",
  },
};

// ============================================================================
// Spacer Interface
// ============================================================================

export interface SpacerProps {
  /** Size of space */
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Direction */
  direction?: "horizontal" | "vertical";
}

export const SpacerInterface: ComponentInterface<SpacerProps, JsonObject> = {
  meta: {
    name: "Spacer",
    version: "1.0.0",
    category: "layout",
    description: "Adds space between elements",
    tier: 1,
  },
  props: {} as SpacerProps,
  callbacks: {},
  defaultProps: {
    size: "md",
    direction: "vertical",
  },
};

// Types are already exported via interface declarations above
