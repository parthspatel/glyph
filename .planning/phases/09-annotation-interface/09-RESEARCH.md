# Phase 9: Annotation Interface - Research

**Researched:** 2026-02-03
**Confidence:** HIGH

---

## Executive Summary

Phase 9 builds the complete annotator experience on top of Phase 8's layout system. The existing codebase already has react-hook-form v7.54, react-hotkeys-hook v5.2.4, Y.js undo/redo manager, and Ajv schema validation. Minimal new dependencies needed: Sonner for toasts (2-3KB), use-debounce for auto-save (650B), react-collapsed for expandable panels.

---

## 1. Standard Stack Recommendations

### Already in Codebase (Phase 8)
| Library | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.54.x | Form state, validation |
| react-hotkeys-hook | 5.2.4 | Keyboard shortcuts |
| @y-js/react | - | Real-time sync, undo/redo |
| ajv | 8.x | Schema validation |
| zod | 3.x | Runtime type validation |

### To Add
| Library | Size | Purpose |
|---------|------|---------|
| sonner | 2-3KB | Toast notifications |
| use-debounce | 650B | Auto-save debouncing |
| react-collapsed | 3KB | Expandable panels (instructions) |

### Don't Hand-Roll
| Problem | Use Instead |
|---------|-------------|
| Toast queue | Sonner (handles stacking, dismiss) |
| Debounce | use-debounce (handles cleanup) |
| Unsaved changes | useUnsavedChanges hook (already exists) |
| Form validation | react-hook-form + zod |
| Keyboard shortcuts | react-hotkeys-hook (context-aware) |
| Undo/redo | Y.js UndoManager (Phase 8) |

---

## 2. Architecture Patterns

### 2.1 Annotation Page Structure
```
AnnotationPage
├── AnnotationToolbar (collapsible)
│   ├── TaskInfo
│   ├── SaveStatus
│   ├── InstructionsButton
│   ├── ShortcutsButton
│   └── SubmitButton
├── InstructionsPanel (expandable)
├── LayoutRenderer (from Phase 8)
│   └── [Layout-controlled content]
├── SkipModal
└── ShortcutsModal
```

### 2.2 Auto-Save Pattern
```typescript
// Debounced auto-save on form changes
const debouncedSave = useDebouncedCallback(
  async (data: AnnotationData) => {
    setSaveStatus('saving');
    await saveDraft(taskId, data);
    setSaveStatus({ saved: new Date() });
  },
  1500 // 1.5s debounce
);

// Watch form changes
useEffect(() => {
  const subscription = form.watch((data) => {
    setSaveStatus('pending');
    debouncedSave(data);
  });
  return () => subscription.unsubscribe();
}, [form, debouncedSave]);
```

### 2.3 Save Status Display
```typescript
type SaveStatus = 
  | 'idle'
  | 'pending'      // Changes detected, debouncing
  | 'saving'       // API call in progress
  | { saved: Date } // Successfully saved
  | { error: string }; // Save failed

// UI: "Saving..." → "Draft saved at 2:34 PM" with sync icon
```

### 2.4 Submit Validation Gate
```typescript
const handleSubmit = form.handleSubmit(async (data) => {
  // 1. Run layout validation (required fields from schema)
  const errors = validateLayout(layoutSchema, data);
  if (errors.length > 0) {
    showValidationErrors(errors);
    return;
  }
  
  // 2. Submit (no confirmation dialog per user decision)
  await submitAnnotation(taskId, data);
  
  // 3. Show success toast
  toast.success('Submitted!');
  
  // 4. Enable "Next Task" button (manual advance)
  setShowNextButton(true);
});
```

### 2.5 Context-Aware Shortcuts
```typescript
// Phase 8's shortcut registry already handles:
// - Reserved keys (Ctrl+Enter, Ctrl+S, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
// - Conflict detection at design-time
// - Context scoping

// Page-level shortcuts
useHotkeys('ctrl+enter', handleSubmit, { enableOnFormTags: true });
useHotkeys('ctrl+s', handleSave, { enableOnFormTags: true });
useHotkeys('?', openShortcutsModal, { enableOnFormTags: false });

// Components register their own shortcuts via ShortcutRegistry
```

### 2.6 Skip Task Flow
```typescript
interface SkipReason {
  id: string;
  label: string;
  isSystem: boolean; // System default vs project-specific
}

const systemSkipReasons: SkipReason[] = [
  { id: 'unclear', label: 'Unclear instructions', isSystem: true },
  { id: 'bad_data', label: 'Bad data quality', isSystem: true },
  { id: 'conflict', label: 'Conflict of interest', isSystem: true },
  { id: 'technical', label: 'Technical issue', isSystem: true },
];

// Project admins can add project-specific reasons
```

### 2.7 Review Interface Pattern
```typescript
// Review page receives original + reviewer's version
interface ReviewPageProps {
  originalAnnotation: Annotation;
  reviewerDraft: Annotation | null;
  actions: ReviewAction[];
}

type ReviewAction = 
  | { type: 'approve' }
  | { type: 'reject'; reason: string }
  | { type: 'edit'; changes: AnnotationData }
  | { type: 'request_changes'; comments: ReviewComment[] };

// Layout controls presentation (side-by-side is default)
// Phase 9 just provides the data and action handlers
```

---

## 3. Common Pitfalls & Prevention

### 3.1 Losing Unsaved Work
**Problem:** User navigates away, loses annotation work.
**Prevention:** 
```typescript
// Already have useUnsavedChanges hook
// Add beforeunload listener for browser close
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedChanges]);
```

### 3.2 Auto-Save Race Conditions
**Problem:** Multiple saves overlap, causing stale data.
**Prevention:**
```typescript
// Use abort controller for in-flight requests
const abortRef = useRef<AbortController>();

const saveDraft = async (data: AnnotationData) => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  
  await api.saveDraft(taskId, data, {
    signal: abortRef.current.signal,
  });
};
```

### 3.3 Keyboard Shortcut Conflicts
**Problem:** Layout shortcuts override reserved keys.
**Prevention:** Phase 8 already validates at design-time via Monaco.
```typescript
const RESERVED_SHORTCUTS = [
  'ctrl+enter', 'ctrl+s', 'ctrl+z', 
  'ctrl+shift+z', 'ctrl+y', '?'
];
// Monaco diagnostics flag conflicts in layout editor
```

### 3.4 Toast Spam During Auto-Save
**Problem:** Showing toast on every save is distracting.
**Prevention:** Use inline status indicator, not toasts.
```typescript
// ✓ Subtle inline: "Draft saved at 2:34 PM"
// ✗ Toast on every save
```

### 3.5 Stale Draft After Task Update
**Problem:** Task data changes after draft was saved.
**Prevention:**
```typescript
// Compare task version when loading
if (draft.taskVersion !== task.version) {
  showWarning('Task has been updated. Use your draft or start fresh?');
}
```

### 3.6 Validation Errors Not Visible
**Problem:** Required field errors hidden in collapsed sections.
**Prevention:**
```typescript
// Scroll to first error and expand containing section
const scrollToFirstError = (errors: ValidationError[]) => {
  const firstErrorRef = errorRefs.current[errors[0].path];
  firstErrorRef?.scrollIntoView({ behavior: 'smooth' });
  expandSectionContaining(errors[0].path);
};
```

---

## 4. API Requirements

### 4.1 Draft Management
```
POST /api/v1/tasks/{taskId}/drafts
  - Create/update draft
  - Body: { data: AnnotationData, version: number }

GET /api/v1/tasks/{taskId}/drafts
  - Load existing draft
  - Returns: { data: AnnotationData, savedAt: string, version: number }

DELETE /api/v1/tasks/{taskId}/drafts
  - Clear draft after submit
```

### 4.2 Annotation Submission
```
POST /api/v1/tasks/{taskId}/annotations
  - Submit final annotation
  - Body: { data: AnnotationData }
  - Triggers workflow transition

POST /api/v1/tasks/{taskId}/skip
  - Skip task
  - Body: { reasonId: string, notes?: string }
```

### 4.3 Skip Reasons
```
GET /api/v1/projects/{projectId}/skip-reasons
  - List available skip reasons
  - Returns system defaults + project-specific

POST /api/v1/projects/{projectId}/skip-reasons (admin only)
  - Add project-specific skip reason
```

### 4.4 Review Actions
```
POST /api/v1/tasks/{taskId}/reviews
  - Submit review decision
  - Body: { action: ReviewAction }

POST /api/v1/tasks/{taskId}/reviews/{reviewId}/comments
  - Add inline comment for request_changes
  - Body: { path: string, content: string }
```

---

## 5. Phase 8 Integration Points

### 5.1 Layout Rendering
- Use `LayoutRenderer` from Phase 8
- Pass task input data as context
- Receive annotation output via form state

### 5.2 Shortcut Registry
- Register page-level shortcuts (Ctrl+Enter, Ctrl+S, ?)
- Phase 8 components register their own
- ShortcutsModal reads from registry

### 5.3 Undo/Redo
- Y.js UndoManager from Phase 8
- Already integrated with form state
- Just expose Ctrl+Z/Ctrl+Y handlers

### 5.4 Schema Validation
- Ajv compile-once pattern from Phase 8
- Layout schema defines required fields
- Validation runs on submit

---

## 6. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Review inline comments | Start with list + manual reference; layout enhancement later |
| Layout validation hooks | Extend layout config with validate function (Ajv schema) |
| Draft conflict resolution | Show warning, let user choose (keep draft or refresh) |

---

## 7. Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Auto-save | HIGH | React Hook Form + use-debounce pattern proven |
| Shortcuts | HIGH | Phase 8 registry exists, react-hotkeys-hook in codebase |
| Validation | HIGH | Ajv + react-hook-form already integrated |
| Review interface | HIGH | Layout-controlled per CONTEXT.md, patterns clear |
| Skip flow | HIGH | Simple form + API, requirements clear |
| Draft persistence | HIGH | Standard CRUD, IndexedDB fallback optional |

---

*Research complete. Ready for planning.*
