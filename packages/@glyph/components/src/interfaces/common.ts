/**
 * Common types for WASM-compatible component interfaces.
 * All types must be JSON-serializable for crossing WASM boundaries.
 */

// JSON serialization primitives
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Change event emitted by components.
 * Serializable for WASM boundary crossing.
 */
export interface ChangeEvent<T = unknown> {
  field: string;
  value: T;
  previousValue?: T;
  timestamp: number;
  source: "user" | "system" | "sync";
}

/**
 * Undo/redo callback interface.
 * Components can request undo/redo and receive notifications.
 */
export interface UndoableCallbacks {
  onUndo?: () => void;
  onRedo?: () => void;
  requestUndo?: () => void;
  requestRedo?: () => void;
}

/**
 * Keyboard shortcut binding.
 */
export interface ShortcutBinding {
  key: string; // e.g., 'ctrl+e', 'shift+enter'
  action: string; // Action identifier
  description?: string;
}

/**
 * Slot content for component composition.
 */
export interface SlotContent {
  type: "component" | "html" | "text";
  content: string; // Component name, HTML string, or text
  props?: JsonObject;
}

/**
 * Validation state for form components.
 */
export interface ValidationState {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

/**
 * Component metadata for registry.
 */
export interface ComponentMeta {
  name: string;
  version: string;
  category: "annotation" | "layout" | "form" | "display" | "control";
  description: string;
  tier: 1 | 2; // Tier 1 = React, Tier 2 = Template
}

/**
 * Component interface definition.
 * Describes a component's API in a WASM-compatible format.
 *
 * Note: Props and Callbacks use Record<string, unknown> constraint
 * rather than strict JsonObject to allow TypeScript interfaces.
 * Actual JSON serialization is enforced at runtime boundaries.
 */
export interface ComponentInterface<TProps = object, TCallbacks = object> {
  meta: ComponentMeta;
  props: TProps;
  callbacks: TCallbacks;
  slots?: Record<string, SlotContent>;
  shortcuts?: ShortcutBinding[];
  defaultProps?: Partial<TProps>;
}

/**
 * Base props shared by all annotation components.
 */
export interface BaseAnnotationProps {
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Base callbacks shared by all annotation components.
 */
export interface BaseAnnotationCallbacks<T = unknown> {
  onChange?: (event: ChangeEvent<T>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Option type for select/radio/checkbox components.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  color?: string;
}

/**
 * Range type for text highlighting.
 */
export interface TextRange {
  start: number;
  end: number;
  label?: string;
  color?: string;
  data?: JsonObject;
}

/**
 * Bounding box coordinates.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
  data?: JsonObject;
}

/**
 * Entity type for NER tagging.
 */
export interface EntityType {
  id: string;
  label: string;
  color: string;
  shortcut?: string;
  description?: string;
}

/**
 * Entity instance in annotated text.
 */
export interface Entity {
  id: string;
  start: number;
  end: number;
  text: string;
  type: string;
  data?: JsonObject;
}

/**
 * Relation between entities.
 */
export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  data?: JsonObject;
}

/**
 * Audio/video segment.
 */
export interface MediaSegment {
  id: string;
  start: number;
  end: number;
  label?: string;
  color?: string;
  data?: JsonObject;
}
