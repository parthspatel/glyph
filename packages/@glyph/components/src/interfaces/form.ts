/**
 * Form component interfaces.
 * These define the WASM-compatible API for form components.
 */

import type { ComponentInterface, SelectOption, ChangeEvent } from "./common";

// ============================================================================
// Select Interface
// ============================================================================

export interface SelectProps {
  /** Available options */
  options: SelectOption[];
  /** Current value */
  value: string | string[];
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Allow searching/filtering */
  searchable?: boolean;
  /** Mark as required */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Allow clearing selection */
  clearable?: boolean;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Error message */
  error?: string;
}

export interface SelectCallbacks {
  onChange?: (event: ChangeEvent<string | string[]>) => void;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SelectInterface: ComponentInterface<SelectProps, SelectCallbacks> =
  {
    meta: {
      name: "Select",
      version: "1.0.0",
      category: "form",
      description: "Dropdown select with single or multiple selection",
      tier: 1,
    },
    props: {} as SelectProps,
    callbacks: {} as SelectCallbacks,
    shortcuts: [
      {
        key: "ArrowDown",
        action: "nextOption",
        description: "Move to next option",
      },
      {
        key: "ArrowUp",
        action: "prevOption",
        description: "Move to previous option",
      },
      {
        key: "Enter",
        action: "selectOption",
        description: "Select current option",
      },
      { key: "Escape", action: "close", description: "Close dropdown" },
    ],
    defaultProps: {
      multiple: false,
      searchable: false,
      required: false,
      disabled: false,
      clearable: true,
    },
  };

// ============================================================================
// TextArea Interface
// ============================================================================

export interface TextAreaProps {
  /** Current value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Number of visible rows */
  rows?: number;
  /** Maximum character count */
  maxLength?: number;
  /** Mark as required */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Auto-resize to content */
  autoResize?: boolean;
  /** Show character count */
  showCount?: boolean;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Error message */
  error?: string;
}

export interface TextAreaCallbacks {
  onChange?: (event: ChangeEvent<string>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const TextAreaInterface: ComponentInterface<
  TextAreaProps,
  TextAreaCallbacks
> = {
  meta: {
    name: "TextArea",
    version: "1.0.0",
    category: "form",
    description: "Multi-line text input",
    tier: 1,
  },
  props: {} as TextAreaProps,
  callbacks: {} as TextAreaCallbacks,
  defaultProps: {
    rows: 4,
    required: false,
    disabled: false,
    readOnly: false,
    autoResize: false,
    showCount: false,
  },
};

// ============================================================================
// Checkbox Interface
// ============================================================================

export interface CheckboxProps {
  /** Checkbox label */
  label: string;
  /** Checked state */
  checked: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Help text */
  helpText?: string;
}

export interface CheckboxCallbacks {
  onChange?: (event: ChangeEvent<boolean>) => void;
}

export const CheckboxInterface: ComponentInterface<
  CheckboxProps,
  CheckboxCallbacks
> = {
  meta: {
    name: "Checkbox",
    version: "1.0.0",
    category: "form",
    description: "Boolean checkbox input",
    tier: 1,
  },
  props: {} as CheckboxProps,
  callbacks: {} as CheckboxCallbacks,
  shortcuts: [
    { key: "Space", action: "toggle", description: "Toggle checkbox" },
  ],
  defaultProps: {
    checked: false,
    indeterminate: false,
    disabled: false,
  },
};

// ============================================================================
// RadioGroup Interface
// ============================================================================

export interface RadioGroupProps {
  /** Available options */
  options: SelectOption[];
  /** Current selected value */
  value: string;
  /** Group name for form submission */
  name: string;
  /** Mark as required */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Error message */
  error?: string;
}

export interface RadioGroupCallbacks {
  onChange?: (event: ChangeEvent<string>) => void;
}

export const RadioGroupInterface: ComponentInterface<
  RadioGroupProps,
  RadioGroupCallbacks
> = {
  meta: {
    name: "RadioGroup",
    version: "1.0.0",
    category: "form",
    description: "Radio button group for single selection",
    tier: 1,
  },
  props: {} as RadioGroupProps,
  callbacks: {} as RadioGroupCallbacks,
  shortcuts: [
    {
      key: "ArrowDown",
      action: "nextOption",
      description: "Move to next option",
    },
    {
      key: "ArrowUp",
      action: "prevOption",
      description: "Move to previous option",
    },
    {
      key: "ArrowRight",
      action: "nextOption",
      description: "Move to next option",
    },
    {
      key: "ArrowLeft",
      action: "prevOption",
      description: "Move to previous option",
    },
  ],
  defaultProps: {
    required: false,
    disabled: false,
    direction: "vertical",
  },
};

// ============================================================================
// TextField Interface
// ============================================================================

export interface TextFieldProps {
  /** Current value */
  value: string;
  /** Input type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  /** Placeholder text */
  placeholder?: string;
  /** Mark as required */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Maximum character count */
  maxLength?: number;
  /** Pattern for validation */
  pattern?: string;
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Step value (for number type) */
  step?: number;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Prefix element (icon or text) */
  prefix?: string;
  /** Suffix element (icon or text) */
  suffix?: string;
}

export interface TextFieldCallbacks {
  onChange?: (event: ChangeEvent<string>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (key: string) => void;
}

export const TextFieldInterface: ComponentInterface<
  TextFieldProps,
  TextFieldCallbacks
> = {
  meta: {
    name: "TextField",
    version: "1.0.0",
    category: "form",
    description: "Single-line text input",
    tier: 1,
  },
  props: {} as TextFieldProps,
  callbacks: {} as TextFieldCallbacks,
  defaultProps: {
    type: "text",
    required: false,
    disabled: false,
    readOnly: false,
  },
};

// ============================================================================
// Slider Interface
// ============================================================================

export interface SliderProps {
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Show value label */
  showValue?: boolean;
  /** Show tick marks */
  showTicks?: boolean;
  /** Custom class name */
  className?: string;
  /** Label text */
  label?: string;
  /** Help text */
  helpText?: string;
}

export interface SliderCallbacks {
  onChange?: (event: ChangeEvent<number>) => void;
  onChangeEnd?: (value: number) => void;
}

export const SliderInterface: ComponentInterface<SliderProps, SliderCallbacks> =
  {
    meta: {
      name: "Slider",
      version: "1.0.0",
      category: "form",
      description: "Range slider input",
      tier: 1,
    },
    props: {} as SliderProps,
    callbacks: {} as SliderCallbacks,
    shortcuts: [
      { key: "ArrowRight", action: "increase", description: "Increase value" },
      { key: "ArrowLeft", action: "decrease", description: "Decrease value" },
      { key: "Home", action: "min", description: "Set to minimum" },
      { key: "End", action: "max", description: "Set to maximum" },
    ],
    defaultProps: {
      step: 1,
      disabled: false,
      showValue: true,
      showTicks: false,
    },
  };

// Types are already exported via interface declarations above
