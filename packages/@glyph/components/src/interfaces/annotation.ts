/**
 * Annotation component interfaces.
 * These define the WASM-compatible API for annotation components.
 */

import type {
  ComponentInterface,
  BaseAnnotationProps,
  BaseAnnotationCallbacks,
  EntityType,
  Entity,
  Relation,
  BoundingBox,
  MediaSegment,
  SelectOption,
  ChangeEvent,
} from "./common";

// ============================================================================
// NERTagger Interface
// ============================================================================

export interface NERTaggerProps extends BaseAnnotationProps {
  /** Text content to annotate */
  text: string;
  /** Available entity types */
  entityTypes: EntityType[];
  /** Current entities (controlled) */
  value: Entity[];
  /** AI suggestions to display */
  suggestions?: Entity[];
  /** Allow overlapping entities */
  allowOverlapping?: boolean;
  /** Enable keyboard shortcuts */
  enableHotkeys?: boolean;
  /** Show entity type selector inline */
  showTypeSelector?: boolean;
  /** Highlight color for selection */
  selectionColor?: string;
}

export interface NERTaggerCallbacks extends BaseAnnotationCallbacks<Entity[]> {
  /** Called when entities change */
  onChange?: (event: ChangeEvent<Entity[]>) => void;
  /** Called when user accepts a suggestion */
  onAcceptSuggestion?: (suggestion: Entity) => void;
  /** Called when user rejects a suggestion */
  onRejectSuggestion?: (suggestion: Entity) => void;
  /** Called when selection changes */
  onSelectionChange?: (
    selection: { start: number; end: number } | null,
  ) => void;
}

export const NERTaggerInterface: ComponentInterface<
  NERTaggerProps,
  NERTaggerCallbacks
> = {
  meta: {
    name: "NERTagger",
    version: "1.0.0",
    category: "annotation",
    description: "Named Entity Recognition tagger for text annotation",
    tier: 1,
  },
  props: {} as NERTaggerProps,
  callbacks: {} as NERTaggerCallbacks,
  shortcuts: [
    { key: "e", action: "addEntity", description: "Add entity from selection" },
    {
      key: "Delete",
      action: "deleteEntity",
      description: "Delete selected entity",
    },
    {
      key: "Tab",
      action: "cycleLabel",
      description: "Cycle through entity types",
    },
    { key: "Escape", action: "clearSelection", description: "Clear selection" },
  ],
  defaultProps: {
    allowOverlapping: false,
    enableHotkeys: true,
    showTypeSelector: true,
  },
};

// ============================================================================
// Classification Interface
// ============================================================================

export interface ClassificationProps extends BaseAnnotationProps {
  /** Available classification options */
  options: SelectOption[];
  /** Current selected value(s) */
  value: string | string[];
  /** Allow multiple selections */
  multiple?: boolean;
  /** Require at least one selection */
  required?: boolean;
  /** Display style */
  variant?: "buttons" | "dropdown" | "chips";
  /** Number of columns for button layout */
  columns?: number;
}

export interface ClassificationCallbacks
  extends BaseAnnotationCallbacks<string | string[]> {
  onChange?: (event: ChangeEvent<string | string[]>) => void;
}

export const ClassificationInterface: ComponentInterface<
  ClassificationProps,
  ClassificationCallbacks
> = {
  meta: {
    name: "Classification",
    version: "1.0.0",
    category: "annotation",
    description: "Single or multi-label classification component",
    tier: 1,
  },
  props: {} as ClassificationProps,
  callbacks: {} as ClassificationCallbacks,
  shortcuts: [
    { key: "1", action: "selectOption1", description: "Select option 1" },
    { key: "2", action: "selectOption2", description: "Select option 2" },
    { key: "3", action: "selectOption3", description: "Select option 3" },
    { key: "4", action: "selectOption4", description: "Select option 4" },
    { key: "5", action: "selectOption5", description: "Select option 5" },
    { key: "6", action: "selectOption6", description: "Select option 6" },
    { key: "7", action: "selectOption7", description: "Select option 7" },
    { key: "8", action: "selectOption8", description: "Select option 8" },
    { key: "9", action: "selectOption9", description: "Select option 9" },
  ],
  defaultProps: {
    multiple: false,
    required: false,
    variant: "buttons",
  },
};

// ============================================================================
// BoundingBox Interface
// ============================================================================

export interface BoundingBoxProps extends BaseAnnotationProps {
  /** Image URL to annotate */
  imageUrl: string;
  /** Current bounding boxes */
  value: BoundingBox[];
  /** Available labels */
  labels: SelectOption[];
  /** Allow overlapping boxes */
  allowOverlapping?: boolean;
  /** Minimum box size in pixels */
  minSize?: number;
  /** Show label on box */
  showLabels?: boolean;
  /** Allow box resizing */
  allowResize?: boolean;
  /** Zoom level (1.0 = 100%) */
  zoom?: number;
}

export interface BoundingBoxCallbacks
  extends BaseAnnotationCallbacks<BoundingBox[]> {
  onChange?: (event: ChangeEvent<BoundingBox[]>) => void;
  /** Called when a box is selected */
  onBoxSelect?: (boxId: string | null) => void;
  /** Called when zoom changes */
  onZoomChange?: (zoom: number) => void;
}

export const BoundingBoxInterface: ComponentInterface<
  BoundingBoxProps,
  BoundingBoxCallbacks
> = {
  meta: {
    name: "BoundingBox",
    version: "1.0.0",
    category: "annotation",
    description: "Bounding box annotation for images",
    tier: 1,
  },
  props: {} as BoundingBoxProps,
  callbacks: {} as BoundingBoxCallbacks,
  slots: {
    toolbar: { type: "component", content: "" },
  },
  shortcuts: [
    { key: "n", action: "newBox", description: "Start drawing new box" },
    { key: "Delete", action: "deleteBox", description: "Delete selected box" },
    { key: "Escape", action: "cancelDraw", description: "Cancel current draw" },
    { key: "+", action: "zoomIn", description: "Zoom in" },
    { key: "-", action: "zoomOut", description: "Zoom out" },
    { key: "0", action: "zoomReset", description: "Reset zoom" },
  ],
  defaultProps: {
    allowOverlapping: true,
    minSize: 10,
    showLabels: true,
    allowResize: true,
    zoom: 1.0,
  },
};

// ============================================================================
// Relation Interface
// ============================================================================

export interface RelationProps extends BaseAnnotationProps {
  /** Entities that can be connected */
  entities: Entity[];
  /** Current relations */
  value: Relation[];
  /** Available relation types */
  relationTypes: SelectOption[];
  /** Show relation labels on arrows */
  showLabels?: boolean;
  /** Arrow style */
  arrowStyle?: "curved" | "straight" | "elbow";
}

export interface RelationCallbacks extends BaseAnnotationCallbacks<Relation[]> {
  onChange?: (event: ChangeEvent<Relation[]>) => void;
  /** Called when creating a new relation */
  onRelationStart?: (sourceId: string) => void;
  /** Called when relation creation is complete */
  onRelationComplete?: (relation: Relation) => void;
}

export const RelationInterface: ComponentInterface<
  RelationProps,
  RelationCallbacks
> = {
  meta: {
    name: "Relation",
    version: "1.0.0",
    category: "annotation",
    description: "Relation annotation between entities",
    tier: 1,
  },
  props: {} as RelationProps,
  callbacks: {} as RelationCallbacks,
  shortcuts: [
    {
      key: "r",
      action: "startRelation",
      description: "Start creating relation",
    },
    {
      key: "Delete",
      action: "deleteRelation",
      description: "Delete selected relation",
    },
    {
      key: "Escape",
      action: "cancelRelation",
      description: "Cancel relation creation",
    },
  ],
  defaultProps: {
    showLabels: true,
    arrowStyle: "curved",
  },
};

// ============================================================================
// AudioSegment Interface
// ============================================================================

export interface AudioSegmentProps extends BaseAnnotationProps {
  /** Audio URL */
  audioUrl: string;
  /** Current segments */
  value: MediaSegment[];
  /** Available segment labels */
  labels: SelectOption[];
  /** Show waveform visualization */
  showWaveform?: boolean;
  /** Playback rate */
  playbackRate?: number;
  /** Allow overlapping segments */
  allowOverlapping?: boolean;
}

export interface AudioSegmentCallbacks
  extends BaseAnnotationCallbacks<MediaSegment[]> {
  onChange?: (event: ChangeEvent<MediaSegment[]>) => void;
  /** Called when playback position changes */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when a segment is selected */
  onSegmentSelect?: (segmentId: string | null) => void;
}

export const AudioSegmentInterface: ComponentInterface<
  AudioSegmentProps,
  AudioSegmentCallbacks
> = {
  meta: {
    name: "AudioSegment",
    version: "1.0.0",
    category: "annotation",
    description: "Audio segment annotation with waveform",
    tier: 1,
  },
  props: {} as AudioSegmentProps,
  callbacks: {} as AudioSegmentCallbacks,
  shortcuts: [
    { key: "Space", action: "playPause", description: "Play/pause audio" },
    {
      key: "s",
      action: "startSegment",
      description: "Start new segment at current position",
    },
    {
      key: "e",
      action: "endSegment",
      description: "End segment at current position",
    },
    {
      key: "Delete",
      action: "deleteSegment",
      description: "Delete selected segment",
    },
    {
      key: "ArrowLeft",
      action: "seekBack",
      description: "Seek back 5 seconds",
    },
    {
      key: "ArrowRight",
      action: "seekForward",
      description: "Seek forward 5 seconds",
    },
  ],
  defaultProps: {
    showWaveform: true,
    playbackRate: 1.0,
    allowOverlapping: false,
  },
};

// Types are already exported via interface declarations above
