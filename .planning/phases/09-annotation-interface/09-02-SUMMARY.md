# Plan 09-02 Summary: Annotation Page Shell

## Overview

Created the annotation page structure with collapsible toolbar and LayoutRenderer integration.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Task fetching API (getTaskForAnnotation) | ✅ |
| useTaskForAnnotation React Query hook | ✅ |
| SaveStatus component | ✅ |
| AnnotationToolbar component (collapsible) | ✅ |
| AnnotatePage with LayoutRenderer | ✅ |

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 68858c6 | feat(09-02): create task fetching hook and API | 4 files |
| b4ea950 | feat(09-02): create AnnotationToolbar and SaveStatus components | 3 files |
| 690cc17 | feat(09-02): build AnnotatePage with LayoutRenderer integration | 1 file |

## Technical Details

### Task API (apps/web/src/api/tasks.ts)
- `getTaskForAnnotation(taskId)` - Fetches task with layout
- `saveDraft(taskId, data)` - Saves annotation draft
- `getDraft(taskId)` - Gets current user's draft
- `deleteDraft(taskId)` - Deletes draft after submission

### Hooks (apps/web/src/hooks/useTask.ts)
- `useTaskForAnnotation(taskId)` - React Query hook for task with layout
- `useDraft(taskId)` - Hook for fetching draft
- `useSaveDraft(taskId)` - Mutation for saving draft
- `useDeleteDraft(taskId)` - Mutation for deleting draft

### Components
**SaveStatus** - Displays save state with icons:
- idle: "No draft"
- pending: "Unsaved changes"
- saving: "Saving..." with spinner
- saved: "Draft saved at X:XX PM"
- error: "Save failed" with alert icon

**AnnotationToolbar** - Collapsible toolbar:
- Task info (project name, task ID, step type)
- Save status indicator
- Instructions button
- Keyboard shortcuts button
- Skip button
- Submit button
- Collapse/expand with localStorage persistence

### AnnotatePage
- Fetches task with layout via `useTaskForAnnotation`
- Renders `LayoutRenderer` with context (input, output, user, task)
- Shows loading spinner and error states
- Placeholder panels for Instructions and Shortcuts (Plan 09-06)
- Placeholder handlers for Submit (Plan 09-05) and Skip (Plan 09-04)

## Verification

- [x] `pnpm --filter web build` passes
- [x] AnnotatePage renders with toolbar
- [x] Toolbar collapse state persists in localStorage
- [x] SaveStatus displays appropriate states

## Notes

The page structure is complete. Auto-save, skip flow, submission, and instructions panel will be implemented in subsequent plans.
