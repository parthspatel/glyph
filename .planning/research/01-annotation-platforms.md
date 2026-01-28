# Annotation Platform Patterns Research

**Project:** Glyph Data Annotation Platform  
**Researched:** 2026-01-28  
**Mode:** Ecosystem Research  
**Overall Confidence:** MEDIUM (based primarily on training data; WebSearch/WebFetch unavailable for verification)

---

## Executive Summary

This research examines production patterns from major annotation platforms (Label Studio, Prodigy, CVAT, Labelbox, Doccano, Snorkel) and synthesizes best practices for Glyph's architecture. Key findings:

1. **Data Model:** Glyph's existing schema is well-designed with proper partitioning and event sourcing. The JSONB approach for annotation data is correct for flexibility.

2. **Assignment:** Pool-based assignment with optimistic locking is the industry standard for scale. Glyph should implement Redis-backed task reservation with TTL.

3. **UI/UX:** Keyboard-first design is critical. Every annotation action needs a hotkey. Progress mechanics (streaks, milestones) significantly improve throughput.

4. **Scale:** Hash partitioning (already implemented) is correct. Add read replicas and materialized views for analytics workloads.

5. **Export:** Streaming exports with cursor-based pagination are essential at 100k+ tasks. Pre-compute exports asynchronously.

---

## 1. Data Models & Schema Design

### 1.1 How Major Platforms Structure Core Entities

**Confidence: MEDIUM** (Based on training data knowledge of Label Studio/Prodigy architecture)

#### Label Studio Pattern
```
Project
└── Task (input data, predictions, annotations)
    └── Annotation (result JSON, was_cancelled, lead_time)
        └── AnnotationResult (value, from_name, to_name, type)
```

- Tasks store `data` (input) and `predictions` (ML suggestions) as JSONB
- Annotations are separate from tasks, allowing multiple per task
- Results within annotations are nested JSON arrays
- `from_name`/`to_name` link to template regions

#### Prodigy Pattern
```
Dataset
└── Example (text, spans, label, meta, answer)
    └── spans: [{start, end, label, ...}]
```

- Flat structure optimized for streaming
- Single table with JSONB for everything
- `answer` field (accept/reject/ignore) is first-class
- Meta field for arbitrary client data

#### CVAT Pattern
```
Project
└── Task
    └── Job (segment of task)
        └── Label (on image/frame)
            └── Attribute
```

- Jobs are work units within tasks (for video: frame ranges)
- Granular assignment at job level, not task level
- Strong separation of annotation structure from data

### 1.2 Recommended Approach for Glyph

**Glyph's existing model is well-designed.** Key observations:

1. **Task → Assignment → Annotation separation is correct**
   - Allows multiple annotators per task (consensus workflows)
   - Assignments track who/when/status separately from output

2. **JSONB for annotation data is the right choice**
   - Annotation schemas vary wildly across projects
   - Normalized tables would require schema-per-project
   - GIN indexes on JSONB provide query performance

3. **Event sourcing for audit trail is industry best practice**
   - `annotation_events` table with monthly partitions is good
   - Captures full history for compliance/debugging

**Gaps to address:**

| Gap | Recommendation | Priority |
|-----|----------------|----------|
| No pre-annotation/prediction storage | Add `predictions JSONB` to tasks for ML suggestions | HIGH |
| No resolved/gold annotation concept | Add `gold_annotation_id` FK to tasks for quality evaluation | MEDIUM |
| Version chain could be clearer | Consider explicit `parent_version_id` + version sequence | LOW |

### 1.3 JSONB vs Normalized Schema Decision Matrix

**Confidence: HIGH** (Well-established pattern)

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **JSONB** | Flexible, no migrations, fast writes | Harder to enforce constraints, slower cross-field queries | Annotation data, metadata, configuration |
| **Normalized** | Referential integrity, efficient joins, type safety | Schema changes require migrations, more tables | Core entities (tasks, users, projects) |

**Recommendation:** Keep JSONB for `data`, `input_data`, `metadata`, `client_metadata` fields. Keep normalized for relationships (task→project, annotation→task→user).

---

## 2. UI/UX Patterns for Annotators

### 2.1 Keyboard Shortcuts and Efficiency

**Confidence: HIGH** (Universal pattern across all tools)

**Critical insight:** Professional annotators spend 6-8 hours daily annotating. Every mouse movement costs time. Best tools are keyboard-first.

#### Essential Keyboard Patterns

| Action | Common Binding | Notes |
|--------|----------------|-------|
| Submit & Next | `Enter` or `Ctrl+Enter` | Most important - must be one key |
| Skip task | `Escape` | Don't force annotation of unclear items |
| Label selection | `1-9` or letter keys | Map to most common labels |
| Accept suggestion | `Tab` | For pre-annotations |
| Reject suggestion | `Backspace` | For pre-annotations |
| Undo | `Ctrl+Z` | Must be instant, local-first |
| Toggle entity type | `Shift+1-9` | For NER/span annotation |

#### Glyph Implementation Recommendations

```typescript
// Global hotkey registry pattern
interface HotkeyConfig {
  // Core workflow
  submit: string;       // Default: "Ctrl+Enter"
  skip: string;         // Default: "Escape"
  undo: string;         // Default: "Ctrl+Z"
  redo: string;         // Default: "Ctrl+Shift+Z"
  
  // Label shortcuts (configurable per project)
  labelShortcuts: Record<string, string>;
  
  // Navigation
  nextField: string;    // Default: "Tab"
  prevField: string;    // Default: "Shift+Tab"
}
```

**Anti-pattern to avoid:** Requiring mouse clicks for submit. Every annotation tool that requires clicking "Submit" has lower throughput.

### 2.2 Progress Indicators and Motivation Mechanics

**Confidence: MEDIUM** (Based on gamification research and tool comparison)

#### Effective Progress Mechanics

| Mechanic | Implementation | Impact |
|----------|----------------|--------|
| **Session counter** | "42 tasks completed today" | High - immediate feedback |
| **Streak tracking** | "5-day streak!" | Medium - retention |
| **Batch progress** | "23/50 in this batch" | High - creates micro-goals |
| **Quality indicator** | "Your agreement rate: 94%" | Medium - self-regulation |
| **Leaderboard** | Team/project rankings | Variable - can be demotivating |

**Recommended dashboard components:**

```
┌─────────────────────────────────────────────────────┐
│  Today: 47 tasks  │  This week: 312  │  Streak: 5d │
├─────────────────────────────────────────────────────┤
│  Current batch: ████████░░ 80% (40/50)              │
│  Quality score: ★★★★☆ 92%                           │
└─────────────────────────────────────────────────────┘
```

**Anti-pattern:** Showing global progress only ("Project is 23% complete"). This is demotivating for individual contributors.

### 2.3 Handling Long Documents vs Short Snippets

**Confidence: MEDIUM** (Based on document annotation tool patterns)

#### Short Snippets (< 500 tokens)
- Show full text inline
- Single scroll region
- Immediate context visible

#### Long Documents (> 500 tokens)
| Pattern | When to Use |
|---------|-------------|
| **Paginated view** | Multi-page PDFs, legal documents |
| **Scrollable with minimap** | Long articles, code files |
| **Sentence-by-sentence** | Streaming annotation (Prodigy style) |
| **Split view** | Document left, annotation panel right |

**Implementation pattern for Glyph:**

```typescript
interface DocumentViewConfig {
  mode: 'inline' | 'paginated' | 'streaming' | 'split';
  
  // For paginated/streaming
  unitSize: number;  // Characters, sentences, or pages
  
  // For split view
  panelRatio: number;  // 0.6 = 60% document, 40% annotation
  
  // For long documents
  showMinimap: boolean;
  showOutline: boolean;  // For structured documents
}
```

---

## 3. Scale Challenges & Solutions

### 3.1 Task Distribution at 100k+ Tasks

**Confidence: HIGH** (Standard distributed systems patterns)

**The problem:** 100k tasks, 150 concurrent users. Naive "get next task" creates hot spots.

#### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Distribution Service                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│   │   Task      │     │   Redis     │     │  Assignment  │  │
│   │   Queue     │────▶│   Cache     │────▶│   Service    │  │
│   │ (Postgres)  │     │  (Hot set)  │     │  (API)       │  │
│   └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

1. **Pre-warm task pool in Redis**
   - Load N tasks (e.g., 1000) from Postgres into Redis sorted set
   - Score by priority, creation time
   - Refill when pool drops below threshold

2. **Atomic reservation**
   - `ZPOPMIN` from Redis for next task
   - Write reservation to Postgres
   - Set TTL for reservation (e.g., 30 minutes)

3. **Background replenishment**
   - Worker process monitors pool size
   - Replenishes from Postgres when low
   - Excludes already-assigned tasks

#### SQL Pattern for Efficient Task Fetching

```sql
-- Get next batch of tasks for pool replenishment
-- Uses existing indexes efficiently
SELECT task_id, priority
FROM tasks
WHERE project_id = $1
  AND status = 'pending'
  AND task_id NOT IN (
    SELECT task_id FROM task_assignments 
    WHERE status IN ('assigned', 'accepted', 'in_progress')
  )
ORDER BY priority DESC, created_at ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;  -- Critical for concurrency
```

### 3.2 Preventing Duplicate Assignments

**Confidence: HIGH** (Standard pattern)

**The problem:** Two users click "get next task" simultaneously, both get same task.

#### Solution: Optimistic Locking with Redis

```rust
// Pseudocode for assignment service
async fn assign_next_task(user_id: Uuid, project_id: Uuid) -> Result<Task> {
    // 1. Check user eligibility and limits
    let active_count = get_active_assignment_count(user_id).await?;
    if active_count >= MAX_CONCURRENT_ASSIGNMENTS {
        return Err(AssignmentError::AssignmentLimitReached);
    }
    
    // 2. Atomic pop from Redis pool
    let task_id: Option<Uuid> = redis.zpopmin(format!("pool:{}", project_id)).await?;
    
    let task_id = match task_id {
        Some(id) => id,
        None => {
            // Pool empty, try direct from Postgres (slower path)
            get_next_task_from_postgres(project_id, user_id).await?
        }
    };
    
    // 3. Create assignment with reservation
    let assignment = TaskAssignment {
        task_id,
        user_id,
        status: AssignmentStatus::Assigned,
        expires_at: Utc::now() + Duration::minutes(30),
        ..
    };
    
    // 4. Persist to Postgres
    insert_assignment(&assignment).await?;
    
    Ok(get_task(task_id).await?)
}
```

**Key insight:** The `FOR UPDATE SKIP LOCKED` clause is essential when falling back to Postgres directly.

### 3.3 Handling Concurrent Edits

**Confidence: HIGH** (Standard optimistic concurrency)

**Scenarios:**
1. User opens task, goes to lunch, comes back - someone else completed it
2. Two reviewers simultaneously approve same annotation
3. User edits while their session expired

**Solution: Version vectors + conflict detection**

```rust
// In Annotation model - already have `version: i32`
// Add optimistic lock check on updates

async fn update_annotation(
    annotation_id: Uuid,
    expected_version: i32,
    new_data: serde_json::Value,
) -> Result<Annotation> {
    let result = sqlx::query!(
        r#"
        UPDATE annotations 
        SET data = $1, version = version + 1, updated_at = now()
        WHERE annotation_id = $2 AND version = $3
        RETURNING *
        "#,
        new_data,
        annotation_id,
        expected_version,
    ).fetch_optional(&pool).await?;
    
    match result {
        Some(row) => Ok(row.into()),
        None => Err(AnnotationError::ConcurrentModification),
    }
}
```

### 3.4 Database Partitioning Strategies

**Confidence: HIGH** (Glyph already implements correctly)

**Current implementation is good:**
- Hash partitioning by task_id (16 partitions)
- Range partitioning for events by month

**Additional recommendations:**

| Table | Partition Strategy | Reason |
|-------|-------------------|--------|
| `tasks` | Hash by `task_id` | Even distribution, parallel scans |
| `annotations` | Hash by `task_id` | Co-locate with tasks |
| `annotation_events` | Range by `occurred_at` | Time-series queries, easy archival |
| `assignment_metrics` | Range by `computed_at` | Time-series, archival |

---

## 4. Assignment & Routing

### 4.1 Smart Assignment Algorithms

**Confidence: MEDIUM** (Based on common scheduling algorithms)

#### Algorithm Options

| Algorithm | How It Works | When to Use |
|-----------|--------------|-------------|
| **Round-robin** | Rotate through eligible users | Equal workload distribution |
| **Least-loaded** | Assign to user with fewest active tasks | Prevent bottlenecks |
| **Quality-weighted** | Weight by historical quality score | Quality-critical projects |
| **Skill-matched** | Filter by required skills, then least-loaded | Specialized work |
| **Affinity** | Prefer users who worked on related tasks | Consistency within groups |

#### Recommended Implementation

```rust
pub struct AssignmentScorer {
    weights: AssignmentWeights,
}

pub struct AssignmentWeights {
    pub load_factor: f64,        // How much to weight current load
    pub quality_factor: f64,     // How much to weight historical quality
    pub skill_match_factor: f64, // How much to weight skill match
    pub affinity_factor: f64,    // How much to weight past work on similar tasks
}

impl AssignmentScorer {
    pub fn score_user(&self, user: &User, task: &Task, context: &AssignmentContext) -> f64 {
        let load_score = 1.0 - (context.active_assignments as f64 / context.max_assignments as f64);
        let quality_score = user.quality_profile.overall_score.unwrap_or(0.5);
        let skill_score = self.calculate_skill_match(user, task);
        let affinity_score = self.calculate_affinity(user, task);
        
        self.weights.load_factor * load_score
            + self.weights.quality_factor * quality_score
            + self.weights.skill_match_factor * skill_score
            + self.weights.affinity_factor * affinity_score
    }
}
```

### 4.2 Pool-Based vs Push-Based Assignment

**Confidence: HIGH** (Well-established patterns)

| Mode | Description | Pros | Cons |
|------|-------------|------|------|
| **Pool (Pull)** | Users request next task | User controls pace, handles variable availability | Can lead to cherry-picking |
| **Push** | System assigns to specific user | Better for specialized work, even distribution | Requires user availability tracking |
| **Hybrid** | Push with pool fallback | Best of both | More complex |

**Recommendation:** Default to pool-based with these constraints:

1. **No cherry-picking:** Don't show task details until accepted
2. **Skip limits:** Allow 3 skips per session before cooldown
3. **Priority ordering:** Pool is priority-sorted, can't jump queue
4. **Push override:** Admins can force-assign specific tasks

---

## 5. Export & Integration Patterns

### 5.1 Common Export Formats

**Confidence: HIGH** (Standard formats)

| Format | Use Case | Rust Crate |
|--------|----------|------------|
| **JSONL** | Default, streaming-friendly | Built-in serde_json |
| **JSON** | Single-file exports | Built-in serde_json |
| **CSV** | Spreadsheet analysis | `csv` |
| **Parquet** | Data science workflows | `arrow2` / `parquet` |
| **COCO** | Computer vision (object detection) | Custom |
| **CoNLL** | NER/NLP sequence labeling | Custom |
| **HuggingFace Datasets** | ML training pipelines | Arrow format |

**Recommendation:** Prioritize JSONL, Parquet, and one domain-specific format (COCO or CoNLL based on primary use case).

### 5.2 Streaming Exports for Large Datasets

**Confidence: HIGH** (Essential at scale)

**Problem:** 100k annotations = potentially gigabytes of data. Can't load into memory.

**Solution: Cursor-based streaming**

```rust
pub struct ExportStream {
    cursor: Option<Uuid>,
    batch_size: usize,
    format: ExportFormat,
}

impl ExportStream {
    pub async fn next_batch(&mut self) -> Result<Option<Vec<u8>>> {
        let annotations = sqlx::query_as!(
            Annotation,
            r#"
            SELECT * FROM annotations
            WHERE project_id = $1
              AND ($2::uuid IS NULL OR annotation_id > $2)
              AND status = 'submitted'
            ORDER BY annotation_id
            LIMIT $3
            "#,
            self.project_id,
            self.cursor,
            self.batch_size as i64,
        ).fetch_all(&pool).await?;
        
        if annotations.is_empty() {
            return Ok(None);
        }
        
        self.cursor = annotations.last().map(|a| a.annotation_id);
        
        let formatted = self.format.encode(&annotations)?;
        Ok(Some(formatted))
    }
}
```

### 5.3 Webhook Patterns for Real-Time Integration

**Confidence: MEDIUM**

**Events to expose:**

| Event | Payload | Use Case |
|-------|---------|----------|
| `task.created` | task_id, project_id, input_data | Trigger pre-annotation |
| `annotation.submitted` | annotation_id, data | Real-time quality check |
| `annotation.approved` | annotation_id, data, quality_score | Feed ML pipeline |
| `task.completed` | task_id, final_annotation | Archive/downstream |
| `project.goal_reached` | project_id, goal_id | Notification |

**Webhook reliability pattern: Transactional outbox**

```rust
pub struct WebhookOutbox {
    pub event_id: Uuid,
    pub webhook_id: Uuid,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub attempts: i32,
    pub next_attempt_at: DateTime<Utc>,
    pub delivered_at: Option<DateTime<Utc>>,
}
```

---

## 6. Actionable Recommendations Summary

### Immediate (Schema Changes)
1. Add `predictions JSONB` column to tasks table
2. Add `gold_annotation_id UUID` FK to tasks table
3. Add `expires_at TIMESTAMPTZ` to task_assignments table

### Short-term (Services)
1. Implement Redis-backed task pool with `ZPOPMIN`
2. Add `FOR UPDATE SKIP LOCKED` to all task fetching queries
3. Implement optimistic locking with version check on annotation updates

### UI/UX Priorities
1. Implement global hotkey registry
2. Add session progress counter (tasks completed today)
3. Support one-key submit (Enter or Ctrl+Enter)

### Export
1. Implement cursor-based streaming export
2. Add Parquet format support
3. Implement transactional outbox for webhooks

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Data Models | MEDIUM | Based on training data; could not verify current Label Studio/CVAT schemas |
| UI/UX Patterns | HIGH | Universal patterns, well-established |
| Scale Solutions | HIGH | Standard distributed systems patterns |
| Assignment Algorithms | MEDIUM | Based on scheduling theory; no real-world benchmarks |
| Export Formats | HIGH | Standard formats, well-documented |
