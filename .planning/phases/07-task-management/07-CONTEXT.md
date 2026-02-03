# Phase 7: Task Management - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Task lifecycle, assignment engine, and annotator queue. This phase delivers:
- Task CRUD API and status lifecycle management
- Assignment engine (skill-based, load-balanced, configurable per step)
- Duplicate assignment prevention and cross-step exclusion
- Assignment accept/reject flow
- Task queue API with filtering/sorting
- WebSocket for real-time queue updates
- Frontend: Task queue view and task detail view

This phase consumes the Workflow Engine (Phase 6) and is consumed by the Annotation Interface (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Assignment Model

- **Assignment mode**: Configurable per workflow step — push (auto-assign), pull (annotator claims from pool), or hybrid (system pre-filters, annotator picks)
- **Load balancing**: Configurable per step with all options available: round-robin, capacity-based, performance-weighted. Default is hybrid capacity + performance
- **Skill matching**: Configurable per project/step — admin sets minimum proficiency level per skill requirement. Options: strict (must have all at certified level), flexible (allow learning level if no certified available), tiered (per-skill minimum)
- **Cross-step exclusion**: Configurable per step pair — admin specifies which steps conflict. Default is always exclude (same annotator cannot work same task in multiple steps)
- **Multi-annotator steps**: Supported — workflows can require N annotators per task for consensus/redundancy (aligns with Phase 6 consensus configuration)

### Priority & Ordering

- **Task priority**: Composite scoring combining deadline urgency, project priority, and task age
- **Priority rules**: Custom weighted scoring per PRD §2.3 — admins define PriorityRule[] with weights for skill_match, quality_score, current_load, round_robin, plus task factors (deadline, project priority, age)
- **Assignment limits**: Max concurrent tasks per user, configurable with no limit as default. No daily caps.

### Queue Experience

- **Queue columns**: Standard view — Task ID, project name, status, task type, priority indicator, time in queue, estimated duration
- **Sorting**: Basic user controls — sort by priority, age, or project (backend supports full PriorityRule[] for system ordering)
- **Filtering**: Extended — filter by project, task type, priority level, date range, step type (annotation/review/adjudication)
- **Task preview**: No preview — annotators accept blind, see content only after committing

### Real-time Updates

- **Update triggers**: Broad — new task assigned, task reassigned, status changes, queue count changes, priority shifts
- **UI refresh behavior**: Gentle merge — new items slide in, current view stays stable until user scrolls/interacts
- **Race condition handling**: Toast notification — "Task no longer available" message, queue refreshes
- **Presence indicators**: Project-level visibility — show who else is active on same project with user chips/profile pics

### Accept/Reject Flow

- **Accept behavior**: Immediate start — accept opens the annotation interface instantly
- **Reject capability**: Reject with reason — annotators can decline but must select/type a reason (conflict of interest, unclear instructions, etc.)
- **Rejected task handling**: Cooldown before reassignment — configurable, 2 minute default to prevent hot-potato
- **No qualified annotators**: Configurable behavior per project/step — options include queue indefinitely, escalate after threshold time (configurable, e.g., 30 min default), or fallback to secondary pool

### Timeout & Abandonment

- **Deferred to Phase 6**: Timeout behavior already defined in Phase 6 CONTEXT.md:
  - Inactivity-based timeout (not wall-clock), 2-hour default, configurable per-step up to 8-hour max
  - Default action: kick out user, save partial work as draft, return task to queue
  - Partial work preservation: never lose annotator progress
  - Partial task priority: only reassigned when no fresh tasks remain

### Claude's Discretion

- WebSocket implementation details (connection management, reconnection strategy)
- Queue pagination and virtual scrolling approach
- Toast notification timing and stacking behavior
- Exact chip/avatar rendering for presence indicators
- API response structure for queue endpoints

</decisions>

<specifics>
## Specific Ideas

- Assignment engine should respect Phase 6's step assignment config (required_skills, required_roles, prevent_reassignment)
- Queue should feel responsive — WebSocket updates should feel instant, not polling-based
- Reject reasons should be predefined options with optional free-text (like GitHub issue templates)
- Priority indicator should be visual (color/icon), not just a number

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-task-management*
*Context gathered: 2026-02-02*
