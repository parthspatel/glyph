# Plan 09-05 Summary: Annotation Submission

## Overview

Implemented annotation submission with validation gate and manual advance flow.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| sonner toast library installed | ✅ |
| Annotation submission API | ✅ |
| useAnnotationSubmit hook | ✅ |
| Submit validation | ✅ |
| Next Task button after submit | ✅ |
| Time tracking | ✅ |

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 80b2f5e | feat(09-05): add sonner and create annotation submission API | 5 files |
| bc70cd1 | feat(09-05): create submit hook with validation and Next Task flow | 3 files |

## Technical Details

### Annotation API (apps/web/src/api/annotations.ts)
- `submitAnnotation(taskId, request)` - POST annotation with data, time_spent_ms, client_metadata
- `getNextTask(projectId?)` - GET next task from queue, returns null if none

### useAnnotationSubmit Hook
- Tracks time_spent_ms from page load
- Basic validation (requires non-empty output)
- Clears draft after successful submit
- Shows toast notifications (success/error)
- Sets showNextButton after successful submit
- goToNext navigates to next task or /queue

### AnnotatePage Integration
- Uses useAnnotationSubmit hook
- Post-submit toolbar shows "Annotation submitted" with Next Task button
- Prevents output changes after submit (read-only mode)
- Ctrl+Enter keyboard shortcut triggers submit

## Verification

- [x] Submit validates empty output
- [x] Successful submit shows toast
- [x] Next Task button appears after submit
- [x] Clicking Next Task navigates appropriately
- [x] Draft cleared on successful submit

## Notes

Schema-based validation can be added later using validateWithSchema from @glyph/layout-runtime. Current implementation uses basic non-empty check.
