# Plan 09-03 Summary: Auto-save with Debounce

## Overview

Implemented continuous auto-save with 1.5s debounce for annotation drafts.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| use-debounce package installed | ✅ |
| Draft API client (draftsApi) | ✅ |
| useDraft hook with auto-save | ✅ |
| AnnotatePage integration | ✅ |
| Browser unsaved changes warning | ✅ |

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| cbf9eef | feat(09-03): add use-debounce and create draft API client | 4 files |
| 8c6d159 | feat(09-03): create useDraft hook with auto-save and integrate into AnnotatePage | 4 files |

## Technical Details

### Draft API (apps/web/src/api/drafts.ts)
- `saveDraft(taskId, data)` - POST to save/upsert draft
- `getDraft(taskId)` - GET draft, returns null on 404
- `deleteDraft(taskId)` - DELETE draft

### useDraft Hook (apps/web/src/hooks/useDraft.ts)
- Uses `useDebouncedCallback` with 1500ms delay
- Auto-loads existing draft on mount via React Query
- Calls `onLoad` callback to initialize output state
- Manages saveStatus states: idle, pending, saving, saved, error
- Cancels in-flight requests on new saves
- Returns: `{ saveStatus, save, clear, isLoading, draftData }`

### AnnotatePage Integration
- Uses `useDraft` hook with `onLoad` callback
- Calls `save(output)` on every output change
- Uses `useUnsavedChanges` hook to warn before leaving
- Shows loading skeleton while draft loads

## Verification

- [x] Changes auto-save after 1.5s inactivity
- [x] "Saving..." shows during save
- [x] "Draft saved at X:XX" shows after save
- [x] Draft loads on return to page
- [x] Browser prompts before leaving with unsaved changes

## Notes

The debounce ensures saves are batched efficiently. The abort controller prevents stale responses from overwriting newer data.
