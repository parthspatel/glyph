/**
 * Display component interfaces.
 * These define the WASM-compatible API for display components.
 */

import type { ComponentInterface, TextRange, JsonObject } from "./common";

// ============================================================================
// TextDisplay Interface
// ============================================================================

export interface TextDisplayProps {
  /** Text content to display */
  text: string;
  /** Text format */
  format?: "plain" | "markdown" | "html";
  /** Highlight ranges */
  highlightRanges?: TextRange[];
  /** Enable text selection */
  selectable?: boolean;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Wrap long lines */
  wordWrap?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Font size */
  fontSize?: "sm" | "base" | "lg" | "xl";
  /** Custom class name */
  className?: string;
}

export interface TextDisplayCallbacks {
  /** Called when text is selected */
  onSelect?: (selection: { start: number; end: number; text: string }) => void;
  /** Called when a highlight is clicked */
  onHighlightClick?: (range: TextRange) => void;
}

export const TextDisplayInterface: ComponentInterface<
  TextDisplayProps,
  TextDisplayCallbacks
> = {
  meta: {
    name: "TextDisplay",
    version: "1.0.0",
    category: "display",
    description: "Read-only text display with optional formatting",
    tier: 1,
  },
  props: {} as TextDisplayProps,
  callbacks: {} as TextDisplayCallbacks,
  defaultProps: {
    format: "plain",
    selectable: true,
    showLineNumbers: false,
    wordWrap: true,
    fontSize: "base",
  },
};

// ============================================================================
// ImageViewer Interface
// ============================================================================

export interface ImageViewerProps {
  /** Image source URL */
  src: string;
  /** Alternative text */
  alt: string;
  /** Enable zoom controls */
  zoomable?: boolean;
  /** Current zoom level (1.0 = 100%) */
  zoom?: number;
  /** Image fit mode */
  fit?: "contain" | "cover" | "fill" | "none";
  /** Enable pan when zoomed */
  pannable?: boolean;
  /** Show zoom controls */
  showControls?: boolean;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Custom class name */
  className?: string;
}

export interface ImageViewerCallbacks {
  /** Called when zoom level changes */
  onZoomChange?: (zoom: number) => void;
  /** Called when image loads */
  onLoad?: () => void;
  /** Called when image fails to load */
  onError?: (error: string) => void;
  /** Called when image is clicked */
  onClick?: (coords: { x: number; y: number }) => void;
}

export const ImageViewerInterface: ComponentInterface<
  ImageViewerProps,
  ImageViewerCallbacks
> = {
  meta: {
    name: "ImageViewer",
    version: "1.0.0",
    category: "display",
    description: "Image display with zoom and pan controls",
    tier: 1,
  },
  props: {} as ImageViewerProps,
  callbacks: {} as ImageViewerCallbacks,
  shortcuts: [
    { key: "+", action: "zoomIn", description: "Zoom in" },
    { key: "-", action: "zoomOut", description: "Zoom out" },
    { key: "0", action: "zoomReset", description: "Reset zoom" },
    { key: "f", action: "fitToScreen", description: "Fit to screen" },
  ],
  defaultProps: {
    zoomable: true,
    zoom: 1.0,
    fit: "contain",
    pannable: true,
    showControls: true,
    maxZoom: 5.0,
    minZoom: 0.1,
  },
};

// ============================================================================
// PDFViewer Interface
// ============================================================================

export interface PDFHighlight {
  page: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  color?: string;
  label?: string;
  data?: JsonObject;
}

export interface PDFViewerProps {
  /** PDF source URL */
  src: string;
  /** Current page number (1-indexed) */
  page?: number;
  /** Scale/zoom level */
  scale?: number;
  /** Highlights to display */
  highlights?: PDFHighlight[];
  /** Show page thumbnails */
  showThumbnails?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Enable text selection */
  selectable?: boolean;
  /** Custom class name */
  className?: string;
}

export interface PDFViewerCallbacks {
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Called when scale changes */
  onScaleChange?: (scale: number) => void;
  /** Called when text is selected */
  onTextSelect?: (selection: {
    page: number;
    text: string;
    rects: PDFHighlight["rects"];
  }) => void;
  /** Called when a highlight is clicked */
  onHighlightClick?: (highlight: PDFHighlight) => void;
  /** Called when PDF loads */
  onLoad?: (info: { pageCount: number }) => void;
  /** Called when PDF fails to load */
  onError?: (error: string) => void;
}

export const PDFViewerInterface: ComponentInterface<
  PDFViewerProps,
  PDFViewerCallbacks
> = {
  meta: {
    name: "PDFViewer",
    version: "1.0.0",
    category: "display",
    description: "PDF document viewer with highlighting",
    tier: 1,
  },
  props: {} as PDFViewerProps,
  callbacks: {} as PDFViewerCallbacks,
  shortcuts: [
    { key: "ArrowRight", action: "nextPage", description: "Next page" },
    { key: "ArrowLeft", action: "prevPage", description: "Previous page" },
    { key: "Home", action: "firstPage", description: "First page" },
    { key: "End", action: "lastPage", description: "Last page" },
    { key: "+", action: "zoomIn", description: "Zoom in" },
    { key: "-", action: "zoomOut", description: "Zoom out" },
  ],
  defaultProps: {
    page: 1,
    scale: 1.0,
    showThumbnails: false,
    showToolbar: true,
    selectable: true,
  },
};

// ============================================================================
// AudioPlayer Interface
// ============================================================================

export interface AudioPlayerProps {
  /** Audio source URL */
  src: string;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Playback rate (1.0 = normal speed) */
  playbackRate?: number;
  /** Volume (0.0 - 1.0) */
  volume?: number;
  /** Muted state */
  muted?: boolean;
  /** Loop playback */
  loop?: boolean;
  /** Auto play */
  autoPlay?: boolean;
  /** Show waveform visualization */
  showWaveform?: boolean;
  /** Show playback controls */
  showControls?: boolean;
  /** Custom class name */
  className?: string;
}

export interface AudioPlayerCallbacks {
  /** Called when playback time updates */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback pauses */
  onPause?: () => void;
  /** Called when playback ends */
  onEnded?: () => void;
  /** Called when duration is known */
  onDurationChange?: (duration: number) => void;
  /** Called when audio fails to load */
  onError?: (error: string) => void;
}

export const AudioPlayerInterface: ComponentInterface<
  AudioPlayerProps,
  AudioPlayerCallbacks
> = {
  meta: {
    name: "AudioPlayer",
    version: "1.0.0",
    category: "display",
    description: "Audio playback with waveform visualization",
    tier: 1,
  },
  props: {} as AudioPlayerProps,
  callbacks: {} as AudioPlayerCallbacks,
  shortcuts: [
    { key: "Space", action: "playPause", description: "Play/pause" },
    { key: "ArrowLeft", action: "seekBack", description: "Seek back 5s" },
    {
      key: "ArrowRight",
      action: "seekForward",
      description: "Seek forward 5s",
    },
    { key: "ArrowUp", action: "volumeUp", description: "Volume up" },
    { key: "ArrowDown", action: "volumeDown", description: "Volume down" },
    { key: "m", action: "toggleMute", description: "Toggle mute" },
  ],
  defaultProps: {
    playbackRate: 1.0,
    volume: 1.0,
    muted: false,
    loop: false,
    autoPlay: false,
    showWaveform: true,
    showControls: true,
  },
};

// ============================================================================
// VideoPlayer Interface
// ============================================================================

export interface VideoPlayerProps {
  /** Video source URL */
  src: string;
  /** Poster image URL */
  poster?: string;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Playback rate (1.0 = normal speed) */
  playbackRate?: number;
  /** Volume (0.0 - 1.0) */
  volume?: number;
  /** Muted state */
  muted?: boolean;
  /** Loop playback */
  loop?: boolean;
  /** Auto play */
  autoPlay?: boolean;
  /** Show playback controls */
  showControls?: boolean;
  /** Video fit mode */
  fit?: "contain" | "cover" | "fill";
  /** Custom class name */
  className?: string;
}

export interface VideoPlayerCallbacks {
  /** Called when playback time updates */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback pauses */
  onPause?: () => void;
  /** Called when playback ends */
  onEnded?: () => void;
  /** Called when duration is known */
  onDurationChange?: (duration: number) => void;
  /** Called when video fails to load */
  onError?: (error: string) => void;
}

export const VideoPlayerInterface: ComponentInterface<
  VideoPlayerProps,
  VideoPlayerCallbacks
> = {
  meta: {
    name: "VideoPlayer",
    version: "1.0.0",
    category: "display",
    description: "Video playback with controls",
    tier: 1,
  },
  props: {} as VideoPlayerProps,
  callbacks: {} as VideoPlayerCallbacks,
  shortcuts: [
    { key: "Space", action: "playPause", description: "Play/pause" },
    { key: "ArrowLeft", action: "seekBack", description: "Seek back 5s" },
    {
      key: "ArrowRight",
      action: "seekForward",
      description: "Seek forward 5s",
    },
    { key: "f", action: "fullscreen", description: "Toggle fullscreen" },
    { key: "m", action: "toggleMute", description: "Toggle mute" },
  ],
  defaultProps: {
    playbackRate: 1.0,
    volume: 1.0,
    muted: false,
    loop: false,
    autoPlay: false,
    showControls: true,
    fit: "contain",
  },
};

// Types are already exported via interface declarations above
