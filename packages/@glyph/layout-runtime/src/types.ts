/**
 * Types for the layout runtime
 */

export interface LayoutContext {
  /** Task input data (read-only) */
  input: Record<string, unknown>;
  /** Annotation output (writable via component binding) */
  output: Record<string, unknown>;
  /** AI suggestions and previous annotations */
  context: {
    ai_suggestions?: unknown[];
    previous_annotations?: unknown[];
  };
  /** Layout configuration */
  config: Record<string, unknown>;
  /** Current user info */
  user: {
    id: string;
    name: string;
    roles: string[];
  };
  /** Task metadata */
  task: {
    id: string;
    project_id: string;
    step_id: string;
  };
}

export interface LayoutConfig {
  id: string;
  name: string;
  version: string;
  template: string;
  schema?: {
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
  };
  settings?: Record<string, unknown>;
}
