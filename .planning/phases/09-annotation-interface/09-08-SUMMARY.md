# Plan 09-08 Summary: Adjudication Interface

## What Was Built

### Adjudication API Client (`apps/web/src/api/adjudication.ts`)
- `getTaskForAdjudication(taskId)` - Fetch task with all conflicting annotations
- `submitResolution(taskId, request)` - Submit final authoritative annotation
- Types: `TaskForAdjudication`, `AnnotationForComparison`, `SubmitResolutionRequest`
- Includes consensus metrics (agreement score) when available

### Adjudication Hooks (`apps/web/src/hooks/useAdjudication.ts`)
- `useTaskForAdjudication(taskId)` - React Query hook for fetching adjudication data
- `useSubmitResolution({ taskId })` - Mutation hook with toast notifications
- Navigates to queue on successful resolution

### Adjudication Components (`apps/web/src/components/adjudication/`)

**AnnotationTabs.tsx**
- Uses shadcn/ui Tabs component
- TabsTrigger for each annotation ("Annotator 1", "Annotator 2", etc.)
- TabsContent with LayoutRenderer (read-only) for each annotation
- Shows annotator name and submission date
- Callback when tab is selected

**ResolutionPanel.tsx**
- Header with "Final Resolution" title and Submit button
- Editable LayoutRenderer for creating the resolution
- Loading state on submit button
- Full task context passed to renderer

### AdjudicatePage (`apps/web/src/pages/AdjudicatePage.tsx`)
- Fetches task for adjudication using `useTaskForAdjudication`
- Initializes resolution from first annotation
- Selecting a tab copies that annotation's data to resolution
- Tracks `sourceAnnotationId` for auditing purposes
- Two-column grid: AnnotationTabs (left) + ResolutionPanel (right)
- Shows annotation count and agreement score in header
- Handles empty annotations edge case

### Routing
- Added `/adjudicate/:taskId` route in `App.tsx`

## Key Decisions

1. **Copy-on-select pattern** - Selecting an annotation tab copies its data to the resolution panel
2. **Source tracking** - Keeps track of which annotation was used as base for auditing
3. **Two-column layout** - Left side for comparison, right side for resolution
4. **Editable resolution** - Adjudicator can modify the resolution data freely
5. **Agreement score display** - Shows consensus metrics when available

## Files Modified
- `apps/web/src/api/adjudication.ts` (new)
- `apps/web/src/api/index.ts` (exports)
- `apps/web/src/hooks/useAdjudication.ts` (new)
- `apps/web/src/hooks/index.ts` (exports)
- `apps/web/src/components/adjudication/AnnotationTabs.tsx` (new)
- `apps/web/src/components/adjudication/ResolutionPanel.tsx` (new)
- `apps/web/src/components/adjudication/index.ts` (new)
- `apps/web/src/pages/AdjudicatePage.tsx` (new)
- `apps/web/src/App.tsx` (route)

## Verification
- ✅ Build compiles successfully
- ✅ Route added for `/adjudicate/:taskId`
- ✅ Multiple annotations displayed in tabs
- ✅ Selecting tab copies data to resolution
- ✅ Resolution panel is editable
- ✅ Submit Resolution button with loading state
