# Plan 09-01 Summary: Annotation API & Types

## Overview

Defined types and API endpoints for annotation workflow: drafts, skip reasons, and reviews.

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Draft, SkipReason, Review TypeScript types | ✅ |
| Draft, SkipReason, Review Rust domain models | ✅ |
| Draft API endpoints (save, get, delete) | ✅ |
| SkipReason API endpoints (list, create, deactivate) | ✅ |
| Review API endpoints (submit, list, add comment) | ✅ |
| Task skip endpoint | ✅ |

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 760a402 | feat(09-01): add Draft, SkipReason, and Review types | 6 files |
| daa0de8 | feat(09-01): create Draft API endpoints | 2 files |
| b16d7da | feat(09-01): create SkipReason and Review API endpoints | 2 files |

## Technical Details

### TypeScript Types (packages/@glyph/types/src/index.ts)
- `Draft` - Auto-saved annotation work in progress
- `SkipReason` - Reason for skipping a task (system or project scope)
- `TaskSkip` - Record of a task being skipped
- `Review` - Reviewer's evaluation with approve/reject/request_changes
- `ReviewComment` - Inline comment on annotation field
- New ID types: DraftId, SkipReasonId, ReviewId, ReviewCommentId

### Rust Domain Models (libs/domain/src/)
- `draft.rs` - Draft struct with version tracking for optimistic locking
- `skip_reason.rs` - SkipReason with scope enum, TaskSkip record
- `review.rs` - Review with action enum, ReviewComment for inline feedback

### API Endpoints
**Drafts:**
- `POST /api/v1/tasks/{task_id}/drafts` - Save/update draft (upsert)
- `GET /api/v1/tasks/{task_id}/drafts` - Get current user's draft
- `DELETE /api/v1/tasks/{task_id}/drafts` - Delete draft

**Skip Reasons:**
- `GET /api/v1/projects/{project_id}/skip-reasons` - List active reasons
- `POST /api/v1/projects/{project_id}/skip-reasons` - Create project reason
- `DELETE /api/v1/projects/{project_id}/skip-reasons/{id}` - Deactivate
- `POST /api/v1/tasks/{task_id}/skip` - Skip a task

**Reviews:**
- `POST /api/v1/tasks/{task_id}/reviews` - Submit review
- `GET /api/v1/tasks/{task_id}/reviews` - List task reviews
- `POST /api/v1/tasks/{task_id}/reviews/{id}/comments` - Add inline comment

## Deviations

**Path correction:** Plan referenced `libs/glyph-core/src/models/` but correct path is `libs/domain/src/`. Auto-fixed per deviation rules.

## Verification

- [x] `cargo check -p glyph-domain` passes
- [x] `cargo check -p glyph-api` passes
- [x] Routes registered in mod.rs
- [x] Types export from index.ts

## Notes

API endpoints are stubbed with placeholder implementations. Database persistence will be added when the repository layer is extended. The type contracts are complete and ready for frontend consumption.
