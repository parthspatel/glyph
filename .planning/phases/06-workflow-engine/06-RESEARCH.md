# Phase 6: Workflow Engine - Research

**Researched:** 2026-02-02
**Status:** Research Complete
**Confidence:** HIGH

---

## Key Library Decisions

### YAML Parsing: `serde_yml`
The original `serde-yaml` library is deprecated (as of 2024). Use `serde_yml`, the actively maintained community fork with full serde integration and improved error handling.

```toml
serde_yml = "0.0.12"
```

### DAG Operations: `petgraph`
Industry-standard Rust graph library. Provides:
- `DiGraph` for directed workflow graphs
- `algo::is_cyclic_directed()` for cycle detection
- `algo::toposort()` for execution ordering
- `visit::DfsPostOrder` for reachability analysis

```toml
petgraph = "0.6"
```

### Retry Logic: `backoff`
Clean exponential backoff implementation for auto-process step retries:

```rust
use backoff::{ExponentialBackoff, backoff::Backoff};

let mut backoff = ExponentialBackoff {
    initial_interval: Duration::from_secs(1),
    multiplier: 4.0,  // 1s, 4s, 16s per user decision
    max_elapsed_time: Some(Duration::from_secs(60)),
    ..Default::default()
};
```

---

## State Machine Pattern

**Recommendation:** Enum-based state machines over type-state patterns.

Type-state enforces compile-time validation but loses runtime flexibility needed for YAML-defined dynamic workflows. Enum approach allows:

```rust
#[derive(Debug, Clone, PartialEq)]
enum StepState {
    Pending,
    Active { started_at: DateTime<Utc>, assigned_to: Vec<UserId> },
    Completed { completed_at: DateTime<Utc>, result: StepResult },
    Skipped { reason: String },
    Failed { error: WorkflowError, retries: u8 },
}
```

Use guard functions for transition validation:

```rust
impl StepState {
    fn can_transition_to(&self, target: &StepState) -> bool {
        matches!((self, target),
            (StepState::Pending, StepState::Active { .. }) |
            (StepState::Active { .. }, StepState::Completed { .. }) |
            // ...
        )
    }
}
```

---

## Event Sourcing Strategy

### Storage Schema (PostgreSQL)

```sql
CREATE TABLE workflow_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL,  -- workflow_instance_id
    stream_type TEXT NOT NULL,  -- 'workflow' or 'task'
    version BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stream_id, version)
) PARTITION BY RANGE (occurred_at);

-- Monthly partitions for data lifecycle
CREATE TABLE workflow_events_2026_02 PARTITION OF workflow_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Snapshot Strategy

- **Interval:** Snapshot every 50 events (research shows 100+ event replay becomes slow)
- **Storage:** Separate `workflow_snapshots` table with serialized aggregate state
- **Rebuild:** On startup, load latest snapshot + replay events after snapshot version

```sql
CREATE TABLE workflow_snapshots (
    snapshot_id UUID PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES workflows(id),
    version BIGINT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_snapshots_stream ON workflow_snapshots(stream_id, version DESC);
```

### Event Types

```rust
enum WorkflowEvent {
    WorkflowStarted { workflow_id: WorkflowId, config: WorkflowConfig },
    StepActivated { step_id: StepId, assigned_to: Vec<UserId> },
    StepCompleted { step_id: StepId, result: StepResult },
    TransitionEvaluated { from: StepId, to: StepId, condition: Option<String> },
    ConsensusCalculated { step_id: StepId, agreement: f64, resolved_by: ResolutionStrategy },
    WorkflowCompleted { final_output: serde_json::Value },
    WorkflowFailed { error: String, recoverable: bool },
}
```

---

## Consensus Algorithm Implementation

### Krippendorff's Alpha

Superior to Cohen's/Fleiss' Kappa because it handles missing data (when annotators skip fields). No mature Rust crate exists — implement in-house.

**Formula:**

```
α = 1 - (Do / De)
```

Where:
- `Do` = observed disagreement (actual disagreement between annotators)
- `De` = expected disagreement (by chance)

**For categorical data:**

```rust
fn krippendorff_alpha_categorical(annotations: &[Vec<Option<&str>>]) -> f64 {
    // coincidence_matrix[i][j] = count of (category_i, category_j) pairs
    // Do = 1 - sum of diagonal / total pairs
    // De = sum over categories of (n_c * (n_c - 1)) / (n * (n - 1))
    // where n_c = count of category c, n = total annotations
}
```

**Performance Threshold:**
- Benchmark at 100/1000/10000 annotations
- Set `evaluation: checkpoint` for datasets > 5000 annotations (estimate)

### Cohen's Kappa (Pairwise)

Simpler, used for exactly 2 annotators:

```rust
fn cohens_kappa(a: &[u32], b: &[u32]) -> f64 {
    let po = observed_agreement(a, b);
    let pe = expected_agreement(a, b);
    (po - pe) / (1.0 - pe)
}
```

### IoU (Span/Box Overlap)

For NER spans and bounding boxes:

```rust
fn iou(span_a: (usize, usize), span_b: (usize, usize)) -> f64 {
    let intersection_start = span_a.0.max(span_b.0);
    let intersection_end = span_a.1.min(span_b.1);
    let intersection = (intersection_end as i64 - intersection_start as i64).max(0) as f64;
    
    let union = (span_a.1 - span_a.0) + (span_b.1 - span_b.0) - intersection as usize;
    intersection / union as f64
}
```

---

## YAML Workflow Schema

Based on PRD §4.8, implement strict validation:

```yaml
version: "1.0"
name: multi-adjudication-workflow
type: multi_adjudication

settings:
  min_annotators: 2
  consensus_threshold: 0.8
  tie_breaker: adjudication
  
steps:
  - id: annotate
    type: annotation
    settings:
      timeout_minutes: 120  # inactivity-based
      visibility: blind
    
  - id: consensus_check
    type: auto_process
    handler: consensus_calculator
    settings:
      agreement_metric: krippendorff_alpha
      threshold: 0.8
      
  - id: adjudicate
    type: adjudication
    settings:
      required_roles: [adjudicator]
      visibility: see_all_annotations
      
transitions:
  - from: annotate
    to: consensus_check
    condition: all_annotations_complete
    
  - from: consensus_check
    to: _complete
    condition: agreement >= threshold
    
  - from: consensus_check
    to: adjudicate
    condition: agreement < threshold
    
  - from: adjudicate
    to: _complete

step_library:
  - ref: "standard-annotation-step"
    overrides:
      timeout_minutes: 60
```

### Validation Rules

1. **Structural Validation:**
   - All referenced step IDs exist
   - No cycles in DAG (use petgraph)
   - All states reachable from initial step
   - Terminal states exist (`_complete`, `_failed`)

2. **Semantic Validation:**
   - Transition conditions are valid expressions
   - Handler references exist in registry
   - Role references are valid
   - Timeout values within bounds (0 < t <= 480 minutes)

3. **Error Messages (per user decision):**
   ```
   Error at step.transitions[2].to:
     Unknown step reference: "reveiw"
     Did you mean: "review"?
     Available steps: [annotate, review, adjudicate, consensus_check]
   ```

---

## PostgreSQL Indexing Strategy

### JSONB Indexing

Use `jsonb_path_ops` operator class for 40-50% smaller indexes:

```sql
CREATE INDEX idx_workflow_state_gin ON workflow_instances 
    USING GIN (current_state jsonb_path_ops);
```

### Workflow Query Patterns

```sql
-- Active workflows by project
CREATE INDEX idx_workflows_project_status ON workflow_instances(project_id, status)
    WHERE status IN ('active', 'pending');

-- Step assignments by user
CREATE INDEX idx_assignments_user_status ON step_assignments(user_id, status)
    WHERE status = 'active';

-- Goals by project (for goal tracking)
CREATE INDEX idx_goals_project ON project_goals(project_id, goal_type);
```

---

## Timeout Handling

Per user decision: inactivity-based, not wall-clock.

### Implementation Pattern

```rust
struct ActivityTracker {
    last_activity: Instant,
    timeout_duration: Duration,
}

impl ActivityTracker {
    fn record_activity(&mut self) {
        self.last_activity = Instant::now();
    }
    
    fn is_timed_out(&self) -> bool {
        self.last_activity.elapsed() > self.timeout_duration
    }
}
```

### Timeout Actions

```rust
enum TimeoutAction {
    KickAndRequeue,  // Default: save draft, return to queue
    Reassign,        // Assign to next available annotator
}

async fn handle_timeout(assignment: &Assignment, action: TimeoutAction) -> Result<()> {
    // 1. Save partial work as draft (never lose progress)
    save_draft(&assignment.task_id, &assignment.partial_work).await?;
    
    // 2. Execute action
    match action {
        TimeoutAction::KickAndRequeue => {
            release_assignment(assignment.id).await?;
            requeue_task(assignment.task_id, Priority::Low).await?;
        }
        TimeoutAction::Reassign => {
            release_assignment(assignment.id).await?;
            assign_to_next_available(assignment.task_id).await?;
        }
    }
    Ok(())
}
```

---

## Common Pitfalls to Avoid

### 1. Workflow Deadlocks
- **Problem:** Conditional branches can create unreachable terminal states
- **Solution:** Pre-validate all paths lead to terminal state during YAML parsing

### 2. Event Replay Performance
- **Problem:** Unbounded event replay for long-running workflows
- **Solution:** Snapshot every 50 events, partition tables monthly

### 3. Consensus Memory Usage
- **Problem:** Holding all annotations in memory for large datasets
- **Solution:** Stream-based calculation with running aggregates where possible

### 4. Goal Update Contention
- **Problem:** High-frequency goal updates create lock contention
- **Solution:** Debounce updates (5-10 seconds as per user decision), use atomic increments

### 5. Sub-Workflow Recursion
- **Problem:** Deep nesting causes stack overflow or resource exhaustion
- **Solution:** Enforce depth limit (recommend 3), track recursion depth in context

---

## Open Questions for Planning

1. **Expression Language Scope:** Should conditional steps use simple comparisons (`field >= value`) or full expression engine (rhai)?
   - **Recommendation:** Start simple, add complexity based on user feedback

2. **Sub-Workflow Recursion Limit:** REQ-WF-008 specifies limits needed but not the value
   - **Recommendation:** Depth=3 default, monitor actual usage

3. **Alpha Calculation Performance Threshold:** At what dataset size does Krippendorff's Alpha become too slow for real-time?
   - **Recommendation:** Benchmark at 100/1000/10000, set checkpoint threshold accordingly

4. **Event Compaction Strategy:** When to archive vs delete events for completed workflows?
   - **Recommendation:** Archive events >30 days old to S3, keep snapshot + first/last 10 events in hot storage

---

*Research complete. Ready for planning.*
