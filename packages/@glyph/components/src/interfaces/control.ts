/**
 * Control flow component interfaces.
 * These define the WASM-compatible API for template control components.
 */

import type { ComponentInterface, JsonObject, JsonValue } from "./common";

// ============================================================================
// Show Interface (Conditional Rendering)
// ============================================================================

export interface ShowProps {
  /** Boolean condition or expression string */
  when: boolean | string;
  /** Fallback content when condition is false */
  fallback?: string;
}

export const ShowInterface: ComponentInterface<ShowProps, JsonObject> = {
  meta: {
    name: "Show",
    version: "1.0.0",
    category: "control",
    description: "Conditional rendering based on boolean expression",
    tier: 1,
  },
  props: {} as ShowProps,
  callbacks: {},
  slots: {
    children: { type: "component", content: "" },
    fallback: { type: "component", content: "" },
  },
  defaultProps: {
    when: true,
  },
};

// ============================================================================
// ForEach Interface (Iteration)
// ============================================================================

export interface ForEachProps {
  /** Array to iterate over */
  items: JsonValue[];
  /** Variable name for each item */
  as: string;
  /** Key expression for React reconciliation */
  key?: string;
  /** Index variable name (optional) */
  indexAs?: string;
  /** Empty state message */
  emptyMessage?: string;
}

export const ForEachInterface: ComponentInterface<ForEachProps, JsonObject> = {
  meta: {
    name: "ForEach",
    version: "1.0.0",
    category: "control",
    description: "Iterate over an array and render children for each item",
    tier: 1,
  },
  props: {} as ForEachProps,
  callbacks: {},
  slots: {
    children: { type: "component", content: "" },
    empty: { type: "component", content: "" },
  },
  defaultProps: {
    as: "item",
    indexAs: "index",
  },
};

// ============================================================================
// Switch Interface (Multi-way Conditional)
// ============================================================================

export interface SwitchProps {
  /** Value to switch on */
  value: JsonValue;
  /** Case mapping: value -> content */
  cases?: Record<string, string>;
}

export const SwitchInterface: ComponentInterface<SwitchProps, JsonObject> = {
  meta: {
    name: "Switch",
    version: "1.0.0",
    category: "control",
    description: "Multi-way conditional rendering",
    tier: 1,
  },
  props: {} as SwitchProps,
  callbacks: {},
  slots: {
    default: { type: "component", content: "" },
  },
  defaultProps: {},
};

// ============================================================================
// Button Interface
// ============================================================================

export interface ButtonProps {
  /** Button label */
  label: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Icon name (left) */
  icon?: string;
  /** Icon name (right) */
  iconRight?: string;
  /** Button type */
  type?: "button" | "submit" | "reset";
  /** Custom class name */
  className?: string;
}

export interface ButtonCallbacks {
  onClick?: () => void;
}

export const ButtonInterface: ComponentInterface<ButtonProps, ButtonCallbacks> =
  {
    meta: {
      name: "Button",
      version: "1.0.0",
      category: "control",
      description: "Clickable button with variants",
      tier: 1,
    },
    props: {} as ButtonProps,
    callbacks: {} as ButtonCallbacks,
    shortcuts: [
      { key: "Enter", action: "click", description: "Activate button" },
      { key: "Space", action: "click", description: "Activate button" },
    ],
    defaultProps: {
      variant: "primary",
      size: "default",
      disabled: false,
      loading: false,
      type: "button",
    },
  };

// ============================================================================
// SubmitButton Interface
// ============================================================================

export interface SubmitButtonProps {
  /** Button label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Require confirmation dialog */
  confirmMessage?: string;
  /** Keyboard shortcut override */
  shortcut?: string;
  /** Custom class name */
  className?: string;
}

export interface SubmitButtonCallbacks {
  onSubmit?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const SubmitButtonInterface: ComponentInterface<
  SubmitButtonProps,
  SubmitButtonCallbacks
> = {
  meta: {
    name: "SubmitButton",
    version: "1.0.0",
    category: "control",
    description: "Submit annotation button with optional confirmation",
    tier: 1,
  },
  props: {} as SubmitButtonProps,
  callbacks: {} as SubmitButtonCallbacks,
  shortcuts: [
    { key: "ctrl+Enter", action: "submit", description: "Submit annotation" },
  ],
  defaultProps: {
    label: "Submit",
    disabled: false,
    loading: false,
  },
};

// ============================================================================
// SkipButton Interface
// ============================================================================

export interface SkipButtonProps {
  /** Button label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Require confirmation message */
  confirmMessage?: string;
  /** Reason options for skip */
  reasonOptions?: Array<{ value: string; label: string }>;
  /** Require reason */
  requireReason?: boolean;
  /** Custom class name */
  className?: string;
}

export interface SkipButtonCallbacks {
  onSkip?: (reason?: string) => void;
}

export const SkipButtonInterface: ComponentInterface<
  SkipButtonProps,
  SkipButtonCallbacks
> = {
  meta: {
    name: "SkipButton",
    version: "1.0.0",
    category: "control",
    description: "Skip task button with optional reason",
    tier: 1,
  },
  props: {} as SkipButtonProps,
  callbacks: {} as SkipButtonCallbacks,
  defaultProps: {
    label: "Skip",
    disabled: false,
    requireReason: false,
  },
};

// ============================================================================
// SaveButton Interface
// ============================================================================

export interface SaveButtonProps {
  /** Button label */
  label?: string;
  /** Show "saved" indicator */
  showStatus?: boolean;
  /** Auto-save enabled */
  autoSave?: boolean;
  /** Auto-save interval in ms */
  autoSaveInterval?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export interface SaveButtonCallbacks {
  onSave?: () => void;
}

export const SaveButtonInterface: ComponentInterface<
  SaveButtonProps,
  SaveButtonCallbacks
> = {
  meta: {
    name: "SaveButton",
    version: "1.0.0",
    category: "control",
    description: "Save draft button with auto-save support",
    tier: 1,
  },
  props: {} as SaveButtonProps,
  callbacks: {} as SaveButtonCallbacks,
  shortcuts: [{ key: "ctrl+s", action: "save", description: "Save draft" }],
  defaultProps: {
    label: "Save Draft",
    showStatus: true,
    autoSave: true,
    autoSaveInterval: 5000,
    disabled: false,
  },
};

// ============================================================================
// UndoRedoButtons Interface
// ============================================================================

export interface UndoRedoButtonsProps {
  /** Show undo button */
  showUndo?: boolean;
  /** Show redo button */
  showRedo?: boolean;
  /** Undo disabled state */
  undoDisabled?: boolean;
  /** Redo disabled state */
  redoDisabled?: boolean;
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Custom class name */
  className?: string;
}

export interface UndoRedoButtonsCallbacks {
  onUndo?: () => void;
  onRedo?: () => void;
}

export const UndoRedoButtonsInterface: ComponentInterface<
  UndoRedoButtonsProps,
  UndoRedoButtonsCallbacks
> = {
  meta: {
    name: "UndoRedoButtons",
    version: "1.0.0",
    category: "control",
    description: "Undo/redo button pair",
    tier: 1,
  },
  props: {} as UndoRedoButtonsProps,
  callbacks: {} as UndoRedoButtonsCallbacks,
  shortcuts: [
    { key: "ctrl+z", action: "undo", description: "Undo" },
    { key: "ctrl+shift+z", action: "redo", description: "Redo" },
    { key: "ctrl+y", action: "redo", description: "Redo (alt)" },
  ],
  defaultProps: {
    showUndo: true,
    showRedo: true,
    undoDisabled: true,
    redoDisabled: true,
    size: "default",
  },
};

// ============================================================================
// ProgressIndicator Interface
// ============================================================================

export interface ProgressIndicatorProps {
  /** Current progress (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Label format */
  labelFormat?: "percent" | "fraction" | "custom";
  /** Custom label */
  customLabel?: string;
  /** Variant */
  variant?: "linear" | "circular";
  /** Size */
  size?: "sm" | "default" | "lg";
  /** Custom class name */
  className?: string;
}

export const ProgressIndicatorInterface: ComponentInterface<
  ProgressIndicatorProps,
  JsonObject
> = {
  meta: {
    name: "ProgressIndicator",
    version: "1.0.0",
    category: "control",
    description: "Progress bar or circular indicator",
    tier: 1,
  },
  props: {} as ProgressIndicatorProps,
  callbacks: {},
  defaultProps: {
    max: 100,
    showLabel: true,
    labelFormat: "percent",
    variant: "linear",
    size: "default",
  },
};

// Types are already exported via interface declarations above
