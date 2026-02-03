# Phase 8: Layout System - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Nunjucks template rendering with a component library for building annotation interfaces. This phase delivers the runtime that renders layouts from templates, the component registry, base annotation components (NERTagger, Classification, BoundingBox, etc.), layout primitives, form/display components, data binding, schema validation, versioning, and the layout preview tool.

**Note:** The following are already defined in PRD §5 and should be followed exactly:
- Three-tier architecture (Tier 1: React components, Tier 2: Nunjucks/MDX/TSX templates, Tier 3: ML services)
- Template formats: Nunjucks (primary), MDX, TSX
- Data binding model: `input`, `output`, `context`, `config`, `user` variables
- Security constraints: allowedComponents, bindingPathPattern, expressionAllowlist, maxDepth, maxIterations
- Component library structure: annotation/, layout/, form/, display/, control/
- LayoutSettings model with auto_save, keyboard_shortcuts, etc.

</domain>

<decisions>
## Implementation Decisions

### Component API Design
- **Props-only data flow** — Components receive all data through explicit props, no context injection
- **Callback props with convention** — Components emit changes via `on{FieldName}Change` callbacks; layout system auto-generates standard handlers that write to `output.{fieldName}`
- **Highly configurable with easy defaults** — Extensive options available for power users, but simple cases require minimal config
- **Both build-time and runtime validation** — Schema validates layout YAML/JSON before deployment, components also validate props at runtime as safety net
- **Configurable error handling per-component** — Author chooses `required={true}` for strict failure or allows graceful fallback with placeholder/empty state
- **Named slots for extension points** — Components define slots (header, footer, toolbar) where authors can inject custom content
- **State as output (opt-in) + optional ref for actions** — Internal state exposed declaratively via output props when needed; refs available for imperative methods (scroll, focus, clear). Default: components manage state internally, no output emitted unless explicitly wired.

### Layout Composition Model
- **Three template formats per PRD** — Nunjucks (primary, Jinja-like), MDX (content-heavy with Markdown), TSX (complex layouts requiring full React)
- **Monaco editor integration** — Template editing uses Monaco with inline error highlighting (squiggles, gutter markers)
- **Inline error display in preview** — Errors render where the broken component would be, with stack trace
- **Three data sources for preview** — Manual JSON entry for quick tests, schema-generated mocks for convenience, real task snapshots for realistic testing
- **Versioning per PRD** — Immutable published layouts, draft/published/deprecated lifecycle, tasks keep the version they started with
- **LayoutSettings per PRD** — auto_save, auto_save_interval, show_progress, keyboard_shortcuts, confirm_submit, allow_skip, custom_css as defined in PRD §5.2

### Annotation Component Behavior
- **Global shortcut registry** — Layout defines all shortcuts in one place, components receive bindings as props. Components still have `enableHotkeys` prop (per PRD) but bindings come from registry. No conflicts, consistent across layouts.
- **Rich selection in NERTagger** — Click-drag for quick selections, double-click for word, shift-click for extending, configurable token-level snapping
- **Configurable entity overlaps** — `allowOverlapping={true|false}` prop, default to no overlap
- **Layout-level undo stack** — Single undo history for entire annotation output. Components can implement custom undo/redo for complex interactions that hooks into layout-level actions.
- **Hybrid validation feedback** — Required field indicators always visible, detailed validation on blur/submit, configurable per-field
- **Configurable AI suggestion mode** — Layout chooses: `aiMode="auto-accept"`, `aiMode="explicit"`, or `aiMode="off"`
- **Configurable confidence display** — Layout chooses whether/how to show ML confidence (hidden, visual cues, or explicit scores)
- **Full accessibility** — All features usable via keyboard, screen reader announcements for state changes, high contrast mode, reduced motion support
- **Virtualized rendering for large inputs** — Only render visible portion, lazy-load as user scrolls for smooth performance on 50+ page documents
- **Real-time sync** — Changes sync immediately across tabs/devices (like Google Docs)
- **Unified selection model across media** — All components share common "selection" concept (text span, image region, time range) with consistent UX patterns
- **Configurable visual feedback density** — Layout can choose "minimal", "standard", or "rich" feedback level for different annotator preferences

### Preview and Authoring Experience
- **Multiple editor locations** — Embedded in admin UI for quick edits, standalone app for dedicated sessions, plus VS Code extension for IDE workflow
- **Auto-reload on save** — Preview updates automatically when file is saved
- **Device presets for viewport** — Dropdown to switch between desktop/tablet/mobile preset sizes
- **Inline documentation in Monaco** — Autocomplete shows prop descriptions, hover shows full docs (standard IDE experience)
- **Interactive state simulation** — Author can interact with preview to build up annotation state, then save as test case
- **Schema inference** — Tool infers input/output schema from template bindings, author refines manually
- **Git-based collaboration** — Templates stored in git repo configured by admin. Platform provides wrapper around standard git workflow (commit, push, PR).

### Claude's Discretion
- Loading skeleton design and animations
- Exact spacing, typography, and visual styling of components
- Internal implementation of virtualization strategy
- Debounce timing for auto-reload
- Specific accessibility implementation details (ARIA patterns)
- Cache strategy for real-time sync
- Monaco extension configuration details

</decisions>

<specifics>
## Specific Ideas

- Monaco editor should feel native — same experience as VS Code for template authoring
- Selection in NERTagger should feel snappy and precise, especially for medical text where character-level accuracy matters
- Real-time sync like Google Docs — annotators shouldn't lose work if they accidentally open two tabs
- Interactive simulation for testing should allow saving test cases for regression — "save this state as a test fixture"
- Git wrapper should be thin — don't reinvent version control, just make it accessible from the UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-layout-system*
*Context gathered: 2026-02-03*
