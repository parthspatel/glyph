/**
 * Component Interface Registry
 *
 * WASM-compatible interface schemas for all Tier 1 components.
 * These interfaces define the contract for props, callbacks, slots, and shortcuts
 * that can be serialized across WASM boundaries.
 */

// Common types
export * from './common';

// Annotation interfaces
export {
  NERTaggerInterface,
  ClassificationInterface,
  BoundingBoxInterface,
  RelationInterface,
  AudioSegmentInterface,
  type NERTaggerProps,
  type NERTaggerCallbacks,
  type ClassificationProps,
  type ClassificationCallbacks,
  type BoundingBoxProps,
  type BoundingBoxCallbacks,
  type RelationProps,
  type RelationCallbacks,
  type AudioSegmentProps,
  type AudioSegmentCallbacks,
} from './annotation';

// Layout interfaces
export {
  SectionInterface,
  GridInterface,
  BoxInterface,
  ColumnInterface,
  HeaderInterface,
  DividerInterface,
  SpacerInterface,
  type SectionProps,
  type SectionCallbacks,
  type GridProps,
  type BoxProps,
  type ColumnProps,
  type HeaderProps,
  type DividerProps,
  type SpacerProps,
} from './layout';

// Form interfaces
export {
  SelectInterface,
  TextAreaInterface,
  CheckboxInterface,
  RadioGroupInterface,
  TextFieldInterface,
  SliderInterface,
  type SelectProps,
  type SelectCallbacks,
  type TextAreaProps,
  type TextAreaCallbacks,
  type CheckboxProps,
  type CheckboxCallbacks,
  type RadioGroupProps,
  type RadioGroupCallbacks,
  type TextFieldProps,
  type TextFieldCallbacks,
  type SliderProps,
  type SliderCallbacks,
} from './form';

// Display interfaces
export {
  TextDisplayInterface,
  ImageViewerInterface,
  PDFViewerInterface,
  AudioPlayerInterface,
  VideoPlayerInterface,
  type TextDisplayProps,
  type TextDisplayCallbacks,
  type ImageViewerProps,
  type ImageViewerCallbacks,
  type PDFHighlight,
  type PDFViewerProps,
  type PDFViewerCallbacks,
  type AudioPlayerProps,
  type AudioPlayerCallbacks,
  type VideoPlayerProps,
  type VideoPlayerCallbacks,
} from './display';

// Control interfaces
export {
  ShowInterface,
  ForEachInterface,
  SwitchInterface,
  ButtonInterface,
  SubmitButtonInterface,
  SkipButtonInterface,
  SaveButtonInterface,
  UndoRedoButtonsInterface,
  ProgressIndicatorInterface,
  type ShowProps,
  type ForEachProps,
  type SwitchProps,
  type ButtonProps,
  type ButtonCallbacks,
  type SubmitButtonProps,
  type SubmitButtonCallbacks,
  type SkipButtonProps,
  type SkipButtonCallbacks,
  type SaveButtonProps,
  type SaveButtonCallbacks,
  type UndoRedoButtonsProps,
  type UndoRedoButtonsCallbacks,
  type ProgressIndicatorProps,
} from './control';

import type { ComponentInterface } from './common';

// Import all interfaces for registry
import {
  NERTaggerInterface,
  ClassificationInterface,
  BoundingBoxInterface,
  RelationInterface,
  AudioSegmentInterface,
} from './annotation';
import {
  SectionInterface,
  GridInterface,
  BoxInterface,
  ColumnInterface,
  HeaderInterface,
  DividerInterface,
  SpacerInterface,
} from './layout';
import {
  SelectInterface,
  TextAreaInterface,
  CheckboxInterface,
  RadioGroupInterface,
  TextFieldInterface,
  SliderInterface,
} from './form';
import {
  TextDisplayInterface,
  ImageViewerInterface,
  PDFViewerInterface,
  AudioPlayerInterface,
  VideoPlayerInterface,
} from './display';
import {
  ShowInterface,
  ForEachInterface,
  SwitchInterface,
  ButtonInterface,
  SubmitButtonInterface,
  SkipButtonInterface,
  SaveButtonInterface,
  UndoRedoButtonsInterface,
  ProgressIndicatorInterface,
} from './control';

/**
 * Registry of all component interfaces.
 * Maps component name to its interface definition.
 */
export const ComponentInterfaces: Record<string, ComponentInterface> = {
  // Annotation
  NERTagger: NERTaggerInterface,
  Classification: ClassificationInterface,
  BoundingBox: BoundingBoxInterface,
  Relation: RelationInterface,
  AudioSegment: AudioSegmentInterface,

  // Layout
  Section: SectionInterface,
  Grid: GridInterface,
  Box: BoxInterface,
  Column: ColumnInterface,
  Header: HeaderInterface,
  Divider: DividerInterface,
  Spacer: SpacerInterface,

  // Form
  Select: SelectInterface,
  TextArea: TextAreaInterface,
  Checkbox: CheckboxInterface,
  RadioGroup: RadioGroupInterface,
  TextField: TextFieldInterface,
  Slider: SliderInterface,

  // Display
  TextDisplay: TextDisplayInterface,
  ImageViewer: ImageViewerInterface,
  PDFViewer: PDFViewerInterface,
  AudioPlayer: AudioPlayerInterface,
  VideoPlayer: VideoPlayerInterface,

  // Control
  Show: ShowInterface,
  ForEach: ForEachInterface,
  Switch: SwitchInterface,
  Button: ButtonInterface,
  SubmitButton: SubmitButtonInterface,
  SkipButton: SkipButtonInterface,
  SaveButton: SaveButtonInterface,
  UndoRedoButtons: UndoRedoButtonsInterface,
  ProgressIndicator: ProgressIndicatorInterface,
} as const;

/**
 * Get component interface by name.
 */
export function getComponentInterface(name: string): ComponentInterface | undefined {
  return ComponentInterfaces[name];
}

/**
 * Get all component names.
 */
export function getComponentNames(): string[] {
  return Object.keys(ComponentInterfaces);
}

/**
 * Get components by category.
 */
export function getComponentsByCategory(
  category: 'annotation' | 'layout' | 'form' | 'display' | 'control'
): ComponentInterface[] {
  return Object.values(ComponentInterfaces).filter(
    (iface) => iface.meta.category === category
  );
}
