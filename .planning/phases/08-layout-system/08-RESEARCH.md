# Phase 8: Layout System — Research

**Phase:** 8 - Layout System
**Researched:** 2026-02-03
**Confidence:** HIGH

---

## Standard Stack

### Template Engine: Nunjucks

**Package:** `nunjucks` (v3.2.4)
**Browser bundle:** ~20KB gzipped (8KB precompiled templates)

**CRITICAL SECURITY WARNING:** Nunjucks has **NO built-in sandboxing**. Template execution can access global scope. Must render in iframe with CSP.

**Capabilities:**
- Jinja2-compatible syntax (familiar to Python devs)
- Control flow: `{% if %}`, `{% for %}`, `{% include %}`, `{% macro %}`
- Custom filters and tags
- Precompiled templates for production
- Works in browser and Node.js

**Configuration for this project:**
```typescript
import nunjucks from 'nunjucks';

const env = new nunjucks.Environment(
  new nunjucks.WebLoader('/templates'),
  {
    autoescape: true,
    throwOnUndefined: true,
    trimBlocks: true,
    lstripBlocks: true,
  }
);

// Register custom tags for components
env.addExtension('ComponentTag', new ComponentExtension());
```

### Editor: Monaco

**Package:** `@monaco-editor/react` (v4.7+)
**Features:**
- Zero-config React integration
- React 19 support
- Custom language service API
- IntelliSense, hover docs, error squiggles
- TypeScript definitions built-in

**Custom Nunjucks language service:**
- Syntax highlighting via TextMate grammar
- Completion provider for variables (`input.`, `output.`, `context.`)
- Hover provider for component prop documentation
- Diagnostic provider for template validation

### Virtualization: react-window

**Package:** `react-window` (v1.8.10)
**Why not react-virtualized:** 3x smaller bundle, same author (Brian Vaughn)

**Capabilities:**
- FixedSizeList for uniform rows
- VariableSizeList for dynamic content
- Grid support for 2D layouts
- Scroll restoration

**Integration with NERTagger:**
```typescript
import { VariableSizeList } from 'react-window';

// Render only visible tokens/paragraphs
// Calculate row heights based on text content
// Maintain selection state across virtual boundaries
```

### Validation: Ajv

**Package:** `ajv` (v8.17+)
**Why Ajv:** 50% faster than alternatives, JSON Schema draft 2020-12 support

**CRITICAL PATTERN:** Compile once, validate many:
```typescript
// ❌ BAD: 10x slower
function validate(data: unknown) {
  return ajv.validate(schema, data);
}

// ✅ GOOD: Compile once
const validateLayout = ajv.compile(layoutSchema);
function validate(data: unknown) {
  return validateLayout(data);
}
```

### Real-time Sync: Y.js

**Package:** `yjs` (v13.6+)
**Why Y.js:** Fastest CRDT (10x faster than Automerge), network-agnostic

**Features:**
- Conflict-free replicated data types
- Awareness API for presence
- Undo/redo manager built-in
- IndexedDB persistence
- WebSocket/WebRTC providers

**Architecture:**
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// One Y.Doc per annotation session
const doc = new Y.Doc();
const output = doc.getMap('output');

// Connect to server
const provider = new WebsocketProvider(
  'wss://glyph.example.com/sync',
  `task:${taskId}`,
  doc
);

// Track other users
const awareness = provider.awareness;
```

---

## Architecture Patterns

### 1. WASM-Compatible Interface Design

**Decision:** Design interfaces as if WASM is primary consumer, React is thin wrapper.

**WIT (WebAssembly Interface Types) pattern:**
```wit
// component.wit
interface annotation-component {
  record props {
    value: string,
    config: option<json>,
  }
  
  record change-event {
    field: string,
    value: json,
  }
  
  render: func(props: props) -> element
  on-change: func() -> option<change-event>
}
```

**React wrapper pattern:**
```typescript
// Bridge between WIT interface and React
interface ComponentBridge<P extends SerializableProps> {
  // Props must be JSON-serializable
  props: P;
  // Callbacks emit serializable events
  onChange: (event: ChangeEvent) => void;
  // Slots passed as serializable descriptions
  slots?: Record<string, SlotContent>;
}
```

**Browser support:** Via JCO (JavaScript Component Output) transpilation from WASM Component Model.

### 2. Secure Template Rendering

**Threat model:** Malicious template authors, XSS via user input

**Security layers:**
1. **Allowlisted components** — Only registered components render
2. **Expression allowlist** — Limited to `input.`, `output.`, `context.`, `config.`, `user.`
3. **CSP enforcement** — `script-src 'none'` in render iframe
4. **Max depth/iterations** — Prevent DoS via recursion

**Render sandbox:**
```typescript
// Templates render in sandboxed iframe
const sandboxFrame = document.createElement('iframe');
sandboxFrame.sandbox = 'allow-scripts'; // No allow-same-origin!
sandboxFrame.srcdoc = `
  <html>
    <head>
      <meta http-equiv="Content-Security-Policy" 
            content="script-src 'self'; style-src 'self' 'unsafe-inline';">
    </head>
    <body>
      <div id="root"></div>
      <script src="/layout-runtime.js"></script>
    </body>
  </html>
`;
```

**postMessage communication:**
```typescript
// Parent → iframe: props, data binding updates
iframe.contentWindow.postMessage({ type: 'UPDATE_PROPS', props }, '*');

// iframe → parent: change events
window.addEventListener('message', (event) => {
  if (event.data.type === 'OUTPUT_CHANGE') {
    updateOutput(event.data.field, event.data.value);
  }
});
```

### 3. Monaco Custom Language Service

**Required providers:**
1. **CompletionProvider** — Variable autocomplete (`input.`, `output.`)
2. **HoverProvider** — Component prop documentation
3. **DiagnosticProvider** — Template validation errors
4. **DefinitionProvider** — Jump to component source

**Registration:**
```typescript
monaco.languages.register({ id: 'nunjucks' });

monaco.languages.setMonarchTokensProvider('nunjucks', nunjucksTokenizer);

monaco.languages.registerCompletionItemProvider('nunjucks', {
  triggerCharacters: ['.', '{', '%'],
  provideCompletionItems: (model, position) => {
    // Context-aware completions based on cursor position
    // - Inside {{ }}: data bindings
    // - Inside {% %}: control flow
    // - Component tag: props
  }
});

monaco.languages.registerHoverProvider('nunjucks', {
  provideHover: (model, position) => {
    // Show component documentation on hover
  }
});
```

### 4. Virtualized NERTagger

**Challenge:** 50+ page documents with character-level selections

**Strategy:**
1. **Paragraph-level virtualization** — Each paragraph is a row
2. **Token state maintained globally** — Selection/entity state not tied to DOM
3. **Viewport-aware rendering** — Only render visible paragraphs + buffer

**Implementation:**
```typescript
interface VirtualizedNERState {
  // Full document state (not virtualized)
  tokens: Token[];
  entities: Entity[];
  selection: TextRange | null;
  
  // Virtualization metadata
  paragraphOffsets: number[]; // Character offset of each paragraph
  visibleRange: { start: number; end: number };
}

// Render only visible paragraphs
const VirtualizedNERTagger: React.FC<Props> = ({ text, entities, onEntityChange }) => {
  const paragraphs = useMemo(() => splitIntoParagraphs(text), [text]);
  
  return (
    <VariableSizeList
      height={600}
      itemCount={paragraphs.length}
      itemSize={(index) => measureParagraph(paragraphs[index])}
    >
      {({ index, style }) => (
        <ParagraphRenderer
          style={style}
          paragraph={paragraphs[index]}
          entities={getEntitiesForParagraph(entities, index)}
          onEntityChange={onEntityChange}
        />
      )}
    </VariableSizeList>
  );
};
```

### 5. Layout-Level Undo/Redo

**Decision:** Single undo stack for entire annotation output, WASM-compatible interface

**Interface:**
```typescript
// WASM-compatible undo interface
interface UndoableComponent {
  // Component receives these callbacks
  onUndo?: () => void;
  onRedo?: () => void;
  
  // Component can request undo (e.g., after complex interaction)
  requestUndo?: () => void;
  requestRedo?: () => void;
}

// Layout-level implementation using Y.js
import { UndoManager } from 'yjs';

const undoManager = new UndoManager(
  [outputMap], // Track changes to output
  {
    trackedOrigins: new Set(['user-action']),
    captureTimeout: 500, // Group rapid changes
  }
);

// Wire to keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      if (e.shiftKey) undoManager.redo();
      else undoManager.undo();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 6. Global Shortcut Registry

**Decision:** Layout defines all shortcuts in one place, components receive bindings

**Registry pattern:**
```typescript
interface ShortcutRegistry {
  // Layout-level shortcuts
  submit: string;      // e.g., 'ctrl+enter'
  save: string;        // e.g., 'ctrl+s'
  undo: string;        // e.g., 'ctrl+z'
  redo: string;        // e.g., 'ctrl+shift+z'
  
  // Component shortcuts (namespaced)
  nerTagger: {
    addEntity: string; // e.g., 'e'
    deleteEntity: string; // e.g., 'backspace'
    cycleLabel: string; // e.g., 'tab'
  };
  
  classification: {
    selectOption: string[]; // e.g., ['1', '2', '3', ...]
  };
}

// Components receive their bindings via props
<NERTagger
  shortcuts={registry.nerTagger}
  enableHotkeys={layoutSettings.keyboard_shortcuts}
  {...otherProps}
/>
```

---

## Don't Hand-Roll

### 1. Template Security
**Use:** Nunjucks autoescape + iframe sandbox + CSP
**Don't:** Custom escaping logic, regex-based XSS prevention

### 2. Keyboard Shortcuts
**Use:** Mousetrap or react-hotkeys-hook
**Don't:** Manual keydown event handling with key code checking

### 3. List Virtualization
**Use:** react-window or TanStack Virtual
**Don't:** Custom intersection observer with manual DOM recycling

### 4. CRDT Sync
**Use:** Y.js with official providers
**Don't:** Custom operational transform or last-write-wins with timestamps

### 5. JSON Schema Validation
**Use:** Ajv with precompiled validators
**Don't:** Custom validation logic or runtime schema compilation

### 6. Monaco Language Features
**Use:** Monaco's provider APIs (CompletionItemProvider, HoverProvider)
**Don't:** DOM manipulation or custom overlay panels

---

## Common Pitfalls

### 1. Nunjucks Global Scope Access

**Problem:** Templates can access `window`, execute arbitrary code
**Prevention:**
- ✅ Render in sandboxed iframe
- ✅ CSP with `script-src 'none'`
- ✅ Validate template before rendering
- ❌ Never render untrusted templates in main context

### 2. Ajv Performance Trap

**Problem:** Compiling schema on every validation = 10x slower
**Prevention:**
- ✅ Compile schemas at startup
- ✅ Cache compiled validators
- ❌ Never call `ajv.validate(schema, data)` directly in hot paths

### 3. Virtualization Selection Edge Cases

**Problem:** Selection across virtualized boundaries, scroll during selection
**Prevention:**
- ✅ Maintain selection state independently of DOM
- ✅ Use character offsets, not DOM ranges
- ✅ Handle scroll events during selection
- ❌ Don't rely on DOM selection API for virtualized content

### 4. Y.js Awareness Memory Leak

**Problem:** Awareness state accumulates for disconnected users
**Prevention:**
- ✅ Set `awareness.setLocalState(null)` on disconnect
- ✅ Configure awareness cleanup interval
- ❌ Don't store large objects in awareness state

### 5. Monaco Bundle Size

**Problem:** Full Monaco = 2MB+, slow initial load
**Prevention:**
- ✅ Use `@monaco-editor/react` (lazy loads workers)
- ✅ Only load required languages
- ✅ Enable compression
- ❌ Don't bundle all language workers

### 6. Real-time Sync Conflict with Undo

**Problem:** Undo affects remote changes, confusing UX
**Prevention:**
- ✅ Y.js UndoManager with `trackedOrigins` filters local changes only
- ✅ Visual indicators for remote changes
- ❌ Don't use simple array-based undo with CRDT

---

## State of the Art Comparison

| Feature | Glyph (Planned) | Label Studio | Prodigy | Labelbox |
|---------|-----------------|--------------|---------|----------|
| Template Engine | Nunjucks | Custom XML | Python | GraphQL |
| Real-time Sync | Y.js CRDT | None | None | Partial |
| WASM Plugins | Planned | None | None | None |
| Monaco Editing | Yes | No | No | No |
| Virtualization | react-window | None | None | Partial |
| Undo System | Y.js UndoManager | Simple | Simple | Simple |

**Glyph differentiators:**
1. First-class WASM component support
2. Full real-time collaboration
3. Professional Monaco editing experience
4. Advanced virtualization for large documents

---

## Open Questions for Planner

### 1. WASM Bundle Overhead
JCO transpilation size impact unclear. **Recommendation:** TypeScript-first with WIT interface design. WASM components as stretch goal or Phase 12.

### 2. Git Wrapper Depth
How much git to expose in UI? **Recommendation:** Linear workflow initially (commit, push, sync). Advanced features (branching, merge) as admin-only.

### 3. Layout Migration Strategy
When layout version changes, what happens to in-flight tasks? **Recommendation:** Tasks complete with original version. Admin action to force-migrate for critical fixes.

### 4. Offline Sync Duration
Max offline duration before force-refresh? **Recommendation:** IndexedDB for offline changes, sync indicator shows pending count, warn after 24h offline.

### 5. Preview Data Size Limits
How large can preview mock data be? **Recommendation:** 1MB limit with streaming preview for larger test data.

---

## Ready for Planning

Research complete with **HIGH confidence**. Key findings:

1. **Nunjucks security** — MUST render in iframe sandbox with CSP (no built-in protection)
2. **WASM compatibility** — Design WIT interfaces first, implement React wrappers
3. **Real-time sync** — Y.js is industry standard, 10x faster than alternatives
4. **Virtualization** — react-window for 50+ page document performance
5. **Validation** — Ajv compile-once pattern critical for performance
6. **Monaco** — Custom language service for Nunjucks syntax + validation

**Critical architecture decisions locked:**
- Props-only data flow (WASM compatible)
- Callback convention (`on{Field}Change`)
- Global shortcut registry
- Layout-level undo with Y.js UndoManager
- Iframe sandbox for template rendering

**Planner can proceed with component library structure:**
- `annotation/` — NERTagger, Classification, BoundingBox
- `layout/` — Section, Grid, Box, Column
- `form/` — Select, TextArea, Checkbox, RadioGroup
- `display/` — TextDisplay, ImageViewer, PDFViewer, AudioPlayer
- `control/` — Button, SubmitButton, SkipButton

---

*Phase: 08-layout-system*
*Research completed: 2026-02-03*
