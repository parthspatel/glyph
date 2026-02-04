# Plan 09-07 Summary: Review Interface

## What Was Built

### Review API Client (`apps/web/src/api/reviews.ts`)
- `getTaskForReview(taskId)` - Fetch task with annotation for review
- `submitReview(taskId, request)` - Submit review with action and optional corrections
- `addReviewComment(taskId, reviewId, request)` - Add inline comment to review
- `getReviews(taskId)` - List all reviews for a task
- Types: `TaskForReview`, `SubmitReviewRequest`, `AddCommentRequest`

### Review Hooks (`apps/web/src/hooks/useReview.ts`)
- `useTaskForReview(taskId)` - React Query hook for fetching review data
- `useSubmitReview({ taskId })` - Mutation hook with toast notifications
- `useTaskReviews(taskId)` - Fetch all reviews for a task
- Action labels mapping for user-friendly toast messages

### Review Components (`apps/web/src/components/review/`)

**ReviewSideBySide.tsx**
- Grid layout with two columns
- Left: Original annotation (read-only LayoutRenderer)
- Right: Corrections (editable LayoutRenderer)
- Headers indicating which side is which
- Full task context passed to both renderers

**ReviewActions.tsx**
- Three action buttons: Approve, Reject, Request Changes
- "Approve with Edits" label when corrections made
- Request Changes requires note via textarea
- Loading states on all buttons during submission
- Visual indicator when corrections have been made

**ReviewComments.tsx**
- Placeholder component for displaying inline comments
- Shows comment path and content
- Ready for future inline commenting feature

### ReviewPage (`apps/web/src/pages/ReviewPage.tsx`)
- Fetches task for review using `useTaskForReview`
- Initializes corrected data from original annotation
- Detects if corrections were made via deep equality check
- Header with task info, annotator name, and submission time
- Side-by-side comparison view
- Action footer with all review actions
- Navigates to queue on successful submission

### Routing
- Added `/review/:taskId` route in `App.tsx`

## Key Decisions

1. **Deep copy for correction detection** - Using JSON.stringify comparison to detect if reviewer made changes
2. **Dual LayoutRenderer approach** - Both sides use same layout but with different output data and read-only flags
3. **Note required for Request Changes** - Enforces feedback quality for annotators
4. **Navigate to queue on success** - Keeps reviewers in the workflow

## Files Modified
- `apps/web/src/api/reviews.ts` (new)
- `apps/web/src/api/index.ts` (exports)
- `apps/web/src/hooks/useReview.ts` (new)
- `apps/web/src/hooks/index.ts` (exports)
- `apps/web/src/components/review/ReviewSideBySide.tsx` (new)
- `apps/web/src/components/review/ReviewActions.tsx` (new)
- `apps/web/src/components/review/ReviewComments.tsx` (new)
- `apps/web/src/components/review/index.ts` (new)
- `apps/web/src/pages/ReviewPage.tsx` (new)
- `apps/web/src/App.tsx` (route)

## Verification
- ✅ Build compiles successfully
- ✅ Route added for `/review/:taskId`
- ✅ Side-by-side layout with original and correction panels
- ✅ Approve, Reject, Request Changes actions implemented
- ✅ Request Changes requires summary note
