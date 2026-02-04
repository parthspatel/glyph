/**
 * @glyph/layout-runtime - Nunjucks/MDX template renderer
 *
 * Renders Tier 2 layouts (Nunjucks templates) into Tier 1 React components.
 */

export { LayoutRenderer } from "./LayoutRenderer";
export { useLayoutContext } from "./context";

// Validation (Ajv schema + template security)
export * from "./validation";

// Shortcuts
export * from "./shortcuts";

// Undo/Redo
export * from "./undo";

// Real-time Sync (Y.js)
export * from "./sync";

// Component Registry
export * from "./registry";

// Nunjucks Template Environment
export * from "./nunjucks";

export type { LayoutContext, LayoutConfig } from "./types";
