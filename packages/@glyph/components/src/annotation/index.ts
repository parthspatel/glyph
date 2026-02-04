/**
 * Annotation components for data labeling
 */

// NERTagger with virtualization support
export { NERTagger, type Entity, type EntityType } from "./NERTagger/index";
export type { NERTaggerProps } from "./NERTagger/index";

// Other annotation components
export { Classification } from "./Classification";
export { BoundingBox } from "./BoundingBox";
export { Relation } from "./Relation";
export { AudioSegment } from "./AudioSegment";

export type {
  ClassificationProps,
  ClassificationOption,
} from "./Classification";
export type { BoundingBoxProps, BoundingBoxData, Box } from "./BoundingBox";
export type { RelationProps, RelationData } from "./Relation";
export type { AudioSegmentProps, Segment } from "./AudioSegment";
