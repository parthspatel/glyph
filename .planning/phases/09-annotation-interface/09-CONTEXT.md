# Phase 9: Annotation Interface - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete annotator experience for creating annotations. This phase delivers the annotation page with layout rendering, draft management, submission flow, keyboard shortcuts, skip functionality, and review/adjudication interfaces. The layout system (Phase 8) controls the annotation workspace structure — Phase 9 renders whatever layout is configured and provides the surrounding chrome (toolbar, navigation, status indicators).

</domain>

<decisions>
## Implementation Decisions

### Annotation Page Chrome
- **Collapsible toolbar** — Full toolbar that can collapse to minimal when annotator wants more space
- **Instructions in expandable panel** — Click "Instructions" button to show/hide panel (slides down or modal)
- **No progress indicator in chrome** — Layouts can include their own progress display if desired
- **Manual advance after submit** — Show "Submitted!" toast, then "Next Task" button; annotator controls when to proceed

### Draft & Submission Flow
- **Continuous auto-save** — Save on every change with debounce (~1-2 seconds after last action)
- **Explicit save status** — Show "Saving..." during save, then "Draft saved at 2:34 PM" with sync icon
- **Validation gate on submit** — Check required fields (controlled by layout), show errors if incomplete, submit if valid (no extra confirmation dialog)
- **Draft preserved on leave** — Drafts persist indefinitely; when returning, load draft silently (no banner)
- **Browser prompt before leaving** — "Are you sure you want to leave?" dialog if unsaved changes exist
- **No partial submits** — Validation must pass, all required fields complete
- **Layout validation hooks** — May need to extend layout/component mechanisms for onSubmit validation

### Skip Task Flow
- **Skip with reason required** — Must select/enter why skipping
- **System defaults + project-configurable** — Platform provides default skip reasons, project admins can add project-specific options
- Example default reasons: "Unclear instructions", "Bad data quality", "Conflict of interest", "Technical issue"

### Keyboard Shortcut UX
- **Context-aware shortcuts** — Shortcuts change based on what's focused (text field vs selecting entities)
- **Discoverability: hints + cheatsheet** — Buttons show shortcuts on hover; "?" key opens modal with all available shortcuts for current context
- **No user customization** — Platform defines all shortcuts for consistency across team
- **Reserved keys blocked** — Layouts cannot override reserved shortcuts (ctrl+enter, ctrl+s, ctrl+z, ctrl+shift+z, ctrl+y)
- **Design-time validation** — Layout editor (Monaco) catches shortcut conflicts when designing, not just runtime warnings
- **Cheatsheet modal** — "?" opens modal showing layout-level + component shortcuts currently in scope

### Review Interface
- **Side-by-side view** — Original annotation on one side, reviewer's corrected version on the other (default; layout-controlled)
- **Layout-controlled presentation** — Default layout can be tabs for comparing N annotations + side panel for final; layout designers can customize
- **Full reviewer actions** — Approve, Reject, Edit directly, or Request Changes
- **Request Changes flow** — Inline comments attached to specific parts of annotation + general summary note
- **Review outcomes tracked** — Review decisions (approve/reject/request changes) tracked for reviewer and annotator performance metrics

### Adjudication Interface
- **Entirely layout-controlled** — Layout determines how multiple annotations are displayed and compared
- **Phase 9 provides data** — Pass all annotations to compare to the layout; layout handles presentation
- **Default could be tabs + resolution panel** — But fully customizable per project

### Claude's Discretion
- Exact toolbar layout and button placement
- Toast notification styling and timing
- Shortcut cheatsheet modal design
- Loading states and skeleton screens
- Error message presentation

</decisions>

<specifics>
## Specific Ideas

- Toolbar collapse should remember preference (localStorage)
- Draft save indicator should be subtle but trustworthy — users need confidence their work is saved
- Skip reasons should be trackable for identifying bad data batches or unclear instructions at scale
- Review tracking enables quality metrics on reviewers themselves, not just annotators

</specifics>

<deferred>
## Deferred Ideas

- Real-time collaboration on annotations — future phase
- AI-assisted annotation suggestions displayed in interface — depends on hooks/plugins (Phase 12)
- Annotation comparison/diff view for versioning — future enhancement
- Annotator-to-annotator communication — out of scope

</deferred>

---

*Phase: 09-annotation-interface*
*Context gathered: 2026-02-03*
