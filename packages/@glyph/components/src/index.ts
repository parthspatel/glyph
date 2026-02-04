/**
 * @glyph/components - Tier 1 React components for annotation
 *
 * This package provides the core components used in annotation layouts:
 * - Annotation components (NERTagger, Classification, BoundingBox, etc.)
 * - Layout primitives (Section, Grid, Box, Header)
 * - Form inputs (Select, TextArea, Checkbox, RadioGroup)
 * - Display components (TextDisplay, ImageViewer, etc.)
 * - Control flow (Show, ForEach, Switch)
 */

// Annotation components (excluding Box type to avoid conflict with layout/Box)
export {
  NERTagger,
  Classification,
  BoundingBox,
  Relation,
  AudioSegment,
  type Entity,
  type EntityType,
  type NERTaggerProps,
  type ClassificationProps,
  type ClassificationOption,
  type BoundingBoxProps,
  type BoundingBoxData,
  type RelationProps,
  type RelationData,
  type AudioSegmentProps,
  type Segment,
} from "./annotation";

// Layout components (Box component takes precedence)
export * from "./layout";

// Form components
export * from "./form";

// Display components
export * from "./display";

// Control flow components
export * from "./control";
