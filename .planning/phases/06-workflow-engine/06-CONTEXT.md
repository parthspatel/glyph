# Phase 6: Workflow Engine - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Core workflow engine that orchestrates annotation work through configurable step sequences. Implements state machine, step execution (annotation, review, adjudication, auto-process, conditional, sub-workflow), transition evaluation, consensus calculation, YAML workflow parsing/validation, goal tracking, and event sourcing.

This is backend infrastructure — no UI in this phase. Task Management (Phase 7) and Dashboards (Phase 11) consume this engine.

</domain>

<decisions>
## Implementation Decisions

### Workflow Definition Format

- **Validation strictness**: Strict at save time — reject any workflow with missing fields, invalid step references, or unreachable states before saving
- **Versioning**: Immutable versions — each edit creates a new version. In-flight tasks continue on original version, new tasks use latest. Admin can force-migrate in-flight tasks to new version via explicit action
- **Reusable components**: Named step library — define reusable steps in a registry, workflows reference by name (`ref: "standard-annotation-step"`) with optional `overrides`. Aligns with existing template pattern in PRD §4.8.6
- **Hot-reload**: Enabled in development/staging (YAML changes take effect immediately), production requires versioned deploy
- **Error messages**: Detailed with suggestions — full context, what's wrong, suggested fixes, typo detection (e.g., "Step 'review' references unknown step 'reveiw'. Did you mean 'review'?")

### Step Execution Model

- **Timeout trigger**: Inactivity-based, not wall-clock. 2-hour default inactivity timeout per step, configurable per-step up to 8-hour max
- **Timeout action**: Default kicks out user, saves partial work as draft, returns task to queue. Configurable per-step to `reassign` instead
- **Partial task priority**: Tasks with partial work are only reassigned when no fresh tasks remain in queue — prioritize new work
- **Failure retry**: 3 retries with exponential backoff (1s, 4s, 16s delays) for auto-process steps and handler failures. After retries exhausted, escalate and pause workflow for manual intervention
- **Parallel execution**: Enabled by default — steps that can run in parallel do so unless explicitly sequenced via transitions. Maximize throughput
- **Annotator visibility**: Fully blind by default — annotators cannot see each other's work until step completes and consensus is calculated. Configurable per-step via `visibility: collaborative` for real-time collaboration modes

### Consensus & Resolution

- **Minimum annotators**: Configurable per-workflow, no platform minimum. Single-annotation workflows can specify 1, multi-annotation typically 2-3+
- **Adjudicator eligibility**: Configurable per-workflow via `adjudication.required_roles`. Default requires Adjudicator role
- **Tie-breaking**: Configurable per-workflow. Default to adjudication for ties. Options: `tie_breaker: adjudication | quality_weighted | additional_annotator`
- **Field-level consensus**: Configurable per-workflow. Options: all-or-nothing (entire annotation must match), field-by-field (per-field agreement), or weighted by field importance (critical vs non-critical fields)

### Goal Tracking Behavior

- **Update frequency**: Near real-time with debouncing — goal counters update within 5-10 seconds of submissions, batched for efficiency
- **Goal completion actions**: Configurable array per-goal: `on_complete: [notify, pause, trigger_webhook, archive]`. Multiple actions can fire
- **Quality re-evaluation**: Configurable per-goal. Default to after every submission. Allow `evaluation: rolling_window | checkpoint` for compute-intensive metrics (e.g., Krippendorff's Alpha over large datasets)
- **Alerting**: Configurable, default to both threshold alerts (immediate when metric crosses threshold) and predictive alerts (early warning when trend suggests goal will be missed)

### Claude's Discretion

- State machine implementation details (Rust state pattern vs enum-based)
- Event sourcing storage format and compaction strategy
- YAML parser library choice
- Consensus algorithm implementations (Kappa, Alpha formulas)
- Internal caching strategies for goal calculations
- Transition evaluation engine optimization

</decisions>

<specifics>
## Specific Ideas

- PRD §4.8 defines the complete YAML workflow configuration schema — implementation should match this exactly
- PRD §4.8.6 shows predefined templates (`single`, `multi_adjudication`, `review_required`, `iterative_refinement`) — step library should follow same override pattern
- Timeout is activity-based like session timeout, not task-level deadline — if user is actively working, no timeout
- Partial work preservation is critical — never lose annotator progress on timeout/reassignment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-workflow-engine*
*Context gathered: 2026-02-02*
