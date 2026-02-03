# Phase 7: Task Management - Research

**Researched:** 2026-02-02
**Status:** Research Complete
**Confidence:** HIGH

---

## Standard Stack

### Backend Libraries (Already in Cargo.toml)

| Library | Purpose | Notes |
|---------|---------|-------|
| axum (with ws feature) | WebSocket support | Already enabled - uses extract::ws::{WebSocketUpgrade, WebSocket} |
| tokio::sync::broadcast | Real-time event broadcasting | Multi-producer, multi-consumer for queue updates |
| sqlx | Database operations | Existing, use for task/assignment CRUD |
| serde + serde_json | Serialization | Existing |

### Frontend Libraries (Already in package.json)

| Library | Purpose | Notes |
|---------|---------|-------|
| @tanstack/react-query | Server state management | Already present - use for queue data fetching |
| @tanstack/react-table | Table rendering | Already present - use for queue table |
| zustand | Client state | Already present - use for WebSocket connection state |
| **Add: @tanstack/react-virtual** | Virtual scrolling | Needed for large queue lists (10k+ items) |

### New Frontend Dependencies to Add

\`\`\`json
{
  "@tanstack/react-virtual": "^3.11.0"
}
\`\`\`

No additional Rust dependencies needed - everything is already in the workspace.

---

## Architecture Patterns

### WebSocket Connection Management

**Pattern:** Singleton broadcast hub with per-user subscriptions

\`\`\`rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

/// Central hub for broadcasting queue updates
pub struct QueueUpdateHub {
    /// Global broadcast channel for all updates
    global_tx: broadcast::Sender<QueueEvent>,
    
    /// Per-user channels for targeted updates
    user_channels: Arc<RwLock<HashMap<Uuid, broadcast::Sender<QueueEvent>>>>,
    
    /// Per-project channels for project-scoped updates
    project_channels: Arc<RwLock<HashMap<Uuid, broadcast::Sender<QueueEvent>>>>,
}

impl QueueUpdateHub {
    pub fn new(capacity: usize) -> Self {
        let (global_tx, _) = broadcast::channel(capacity);
        Self {
            global_tx,
            user_channels: Arc::new(RwLock::new(HashMap::new())),
            project_channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Subscribe to updates for a specific user
    pub async fn subscribe_user(&self, user_id: Uuid) -> broadcast::Receiver<QueueEvent> {
        let mut channels = self.user_channels.write().await;
        let tx = channels.entry(user_id).or_insert_with(|| {
            let (tx, _) = broadcast::channel(256);
            tx
        });
        tx.subscribe()
    }
    
    /// Broadcast event to a specific user
    pub async fn notify_user(&self, user_id: Uuid, event: QueueEvent) {
        let channels = self.user_channels.read().await;
        if let Some(tx) = channels.get(&user_id) {
            let _ = tx.send(event);
        }
    }
}
\`\`\`

### WebSocket Event Types

\`\`\`rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum QueueEvent {
    /// New task assigned to user
    TaskAssigned {
        task_id: Uuid,
        step_id: String,
        project_id: Uuid,
        priority: i32,
    },
    
    /// Task was reassigned away from user
    TaskReassigned {
        task_id: Uuid,
        reason: String,
    },
    
    /// Task status changed
    TaskStatusChanged {
        task_id: Uuid,
        old_status: TaskStatus,
        new_status: TaskStatus,
    },
    
    /// Queue count changed for user
    QueueCountChanged {
        total: i64,
        by_project: HashMap<Uuid, i64>,
    },
    
    /// Priority shift notification
    PriorityShifted {
        task_id: Uuid,
        old_priority: i32,
        new_priority: i32,
    },
    
    /// Task no longer available (race condition notification)
    TaskUnavailable {
        task_id: Uuid,
        reason: String,
    },
    
    /// Presence update for project
    PresenceUpdate {
        project_id: Uuid,
        active_users: Vec<UserPresence>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPresence {
    pub user_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub active_since: DateTime<Utc>,
}
\`\`\`

### WebSocket Reconnection Strategy

**Recommendation:** Exponential backoff with jitter

\`\`\`typescript
// Frontend WebSocket hook
function useQueueWebSocket(userId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const connect = useCallback(() => {
    const socket = new WebSocket(\`\${WS_URL}/api/queue/ws\`);
    
    socket.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s max
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 32000);
      // Add jitter (0-1s) to prevent thundering herd
      const jitter = Math.random() * 1000;
      
      setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
        connect();
      }, delay + jitter);
    };
    
    socket.onopen = () => {
      setReconnectAttempt(0);
    };
    
    setWs(socket);
  }, [reconnectAttempt]);
  
  useEffect(() => {
    connect();
    return () => ws?.close();
  }, []);
  
  return ws;
}
\`\`\`

---

## Priority Scoring Algorithm

### Composite Priority Formula

Based on CONTEXT.md decisions: composite scoring combining deadline urgency, project priority, and task age.

**Formula:**

\`\`\`
Priority = (W_deadline x DeadlineScore) + (W_project x ProjectPriority) + (W_age x AgeScore)
\`\`\`

**Default weights (configurable per project):**
- W_deadline = 0.4 (40%)
- W_project = 0.35 (35%)
- W_age = 0.25 (25%)

### Implementation

\`\`\`rust
/// Priority rule configuration (from PRD S2.3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriorityRule {
    /// Weight for deadline urgency (0.0 - 1.0)
    pub deadline_weight: f64,
    /// Weight for project priority (0.0 - 1.0)
    pub project_weight: f64,
    /// Weight for task age (0.0 - 1.0)
    pub age_weight: f64,
    /// Weight for skill match quality (used in assignment, not queue ordering)
    pub skill_match_weight: f64,
    /// Weight for annotator quality score (used in assignment)
    pub quality_score_weight: f64,
    /// Weight for current load (used in assignment)
    pub current_load_weight: f64,
}

impl Default for PriorityRule {
    fn default() -> Self {
        Self {
            deadline_weight: 0.4,
            project_weight: 0.35,
            age_weight: 0.25,
            skill_match_weight: 0.3,
            quality_score_weight: 0.25,
            current_load_weight: 0.45,
        }
    }
}

/// Calculate composite priority score for a task
pub fn calculate_task_priority(
    task: &Task,
    project: &Project,
    rule: &PriorityRule,
    now: DateTime<Utc>,
) -> f64 {
    // Deadline urgency: exponential decay, higher score = more urgent
    // Score 100 at deadline, decays from there
    let deadline_score = task.due_at.map(|due| {
        let hours_until = (due - now).num_hours() as f64;
        if hours_until <= 0.0 {
            100.0 // Overdue gets max urgency
        } else if hours_until <= 24.0 {
            90.0 + (10.0 * (1.0 - hours_until / 24.0))
        } else if hours_until <= 72.0 {
            70.0 + (20.0 * (1.0 - hours_until / 72.0))
        } else {
            (70.0 * (-hours_until / 168.0).exp()).max(10.0) // Decay over a week
        }
    }).unwrap_or(50.0); // No deadline = neutral
    
    // Project priority: direct mapping (1-100 scale assumed)
    let project_score = project.priority as f64;
    
    // Task age: linear increase, capped at 30 days
    let age_hours = (now - task.created_at).num_hours() as f64;
    let age_score = (age_hours / 720.0 * 100.0).min(100.0); // 30 days = max
    
    // Weighted sum
    (rule.deadline_weight * deadline_score)
        + (rule.project_weight * project_score)
        + (rule.age_weight * age_score)
}
\`\`\`

---

## Assignment Engine Design

### Load Balancing Strategies

Per CONTEXT.md: Default is hybrid capacity + performance.

\`\`\`rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum LoadBalancingStrategy {
    /// Simple round-robin rotation
    RoundRobin,
    /// Assign to user with fewest current tasks
    CapacityBased,
    /// Weight by user quality score
    PerformanceWeighted,
    /// Hybrid: capacity (60%) + performance (40%)
    HybridCapacityPerformance,
}

/// Calculate assignment score for a user
pub async fn score_user_for_assignment(
    user: &User,
    task: &Task,
    step_config: &StepConfig,
    strategy: LoadBalancingStrategy,
    user_load: i32,
    max_concurrent: Option<i32>,
) -> Option<f64> {
    // Check if user is at capacity limit
    if let Some(max) = max_concurrent {
        if user_load >= max {
            return None; // Not eligible
        }
    }
    
    // Check skill requirements
    let skill_match = match &step_config.required_skills {
        Some(skills) => {
            let matching = skills.iter()
                .filter(|req| user_has_skill(user, req))
                .count();
            if matching == 0 { return None; } // No skills match
            matching as f64 / skills.len() as f64
        }
        None => 1.0, // No requirements
    };
    
    let base_score = match strategy {
        LoadBalancingStrategy::RoundRobin => 1.0, // All equal
        LoadBalancingStrategy::CapacityBased => {
            // Lower load = higher score
            100.0 - (user_load as f64 * 10.0).min(100.0)
        }
        LoadBalancingStrategy::PerformanceWeighted => {
            user.quality_profile.overall_score.unwrap_or(0.5) * 100.0
        }
        LoadBalancingStrategy::HybridCapacityPerformance => {
            let capacity_score = 100.0 - (user_load as f64 * 10.0).min(100.0);
            let quality_score = user.quality_profile.overall_score.unwrap_or(0.5) * 100.0;
            (capacity_score * 0.6) + (quality_score * 0.4)
        }
    };
    
    Some(base_score * skill_match)
}
\`\`\`

### Skill Matching Modes

Per CONTEXT.md: Configurable per step with strict/flexible/tiered options.

\`\`\`rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SkillMatchMode {
    /// Must have all required skills at certified level
    Strict,
    /// Allow learning level if no certified available
    Flexible,
    /// Per-skill minimum proficiency levels
    Tiered(HashMap<String, ProficiencyLevel>),
}

pub fn check_skill_eligibility(
    user: &User,
    required_skills: &[SkillRequirement],
    mode: &SkillMatchMode,
) -> bool {
    match mode {
        SkillMatchMode::Strict => {
            required_skills.iter().all(|req| {
                user.skills.iter().any(|s| {
                    s.skill_id == req.skill_id 
                        && s.verified 
                        && s.proficiency >= ProficiencyLevel::Intermediate
                })
            })
        }
        SkillMatchMode::Flexible => {
            required_skills.iter().all(|req| {
                user.skills.iter().any(|s| s.skill_id == req.skill_id)
            })
        }
        SkillMatchMode::Tiered(minimums) => {
            required_skills.iter().all(|req| {
                let min_level = minimums.get(&req.skill_id)
                    .copied()
                    .unwrap_or(ProficiencyLevel::Novice);
                user.skills.iter().any(|s| {
                    s.skill_id == req.skill_id && s.proficiency >= min_level
                })
            })
        }
    }
}
\`\`\`

### Cross-Step Exclusion

Per CONTEXT.md: Configurable per step pair, default always exclude.

\`\`\`rust
/// Check if user can be assigned to a step for a task
pub async fn check_cross_step_exclusion(
    pool: &PgPool,
    task_id: Uuid,
    user_id: Uuid,
    target_step_id: &str,
    exclusion_config: &CrossStepExclusionConfig,
) -> Result<bool, sqlx::Error> {
    // Get all previous assignments for this task
    let previous_assignments: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT step_id FROM task_assignments
        WHERE task_id = \$1 AND user_id = \$2
        "#
    )
    .bind(task_id)
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    
    // Check against exclusion rules
    for (prev_step,) in previous_assignments {
        if exclusion_config.is_excluded(&prev_step, target_step_id) {
            return Ok(false); // User is excluded
        }
    }
    
    Ok(true) // User is eligible
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossStepExclusionConfig {
    /// Default behavior for unlisted pairs
    pub default_exclude: bool,
    /// Explicit exclusion pairs (step_a, step_b) - bidirectional
    pub exclusion_pairs: Vec<(String, String)>,
    /// Explicit allow pairs (override default)
    pub allow_pairs: Vec<(String, String)>,
}

impl CrossStepExclusionConfig {
    pub fn is_excluded(&self, from_step: &str, to_step: &str) -> bool {
        // Check explicit allows first
        for (a, b) in &self.allow_pairs {
            if (a == from_step && b == to_step) || (a == to_step && b == from_step) {
                return false;
            }
        }
        
        // Check explicit exclusions
        for (a, b) in &self.exclusion_pairs {
            if (a == from_step && b == to_step) || (a == to_step && b == from_step) {
                return true;
            }
        }
        
        // Fall back to default
        self.default_exclude
    }
}
\`\`\`

---

## Duplicate Assignment Prevention

### Atomic Assignment with Optimistic Locking

\`\`\`rust
/// Atomically claim a task, preventing duplicates
pub async fn claim_task(
    pool: &PgPool,
    task_id: Uuid,
    step_id: &str,
    user_id: Uuid,
    mode: AssignmentMode,
) -> Result<TaskAssignment, AssignmentError> {
    let mut tx = pool.begin().await?;
    
    // Lock the task row and check availability
    let task: Option<(String, i64)> = sqlx::query_as(
        r#"
        SELECT status::text, version
        FROM tasks
        WHERE task_id = \$1
        FOR UPDATE NOWAIT
        "#
    )
    .bind(task_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        if e.to_string().contains("could not obtain lock") {
            AssignmentError::TaskNotAvailable(task_id)
        } else {
            AssignmentError::DatabaseError(e.to_string())
        }
    })?;
    
    let Some((status, version)) = task else {
        return Err(AssignmentError::TaskNotAvailable(task_id));
    };
    
    if status != "pending" && status != "assigned" {
        return Err(AssignmentError::TaskNotAvailable(task_id));
    }
    
    // Check for existing assignment to this step
    let existing: Option<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT assignment_id FROM task_assignments
        WHERE task_id = \$1 AND step_id = \$2 AND user_id = \$3
        AND status NOT IN (expired, reassigned)
        "#
    )
    .bind(task_id)
    .bind(step_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?;
    
    if existing.is_some() {
        return Err(AssignmentError::AlreadyAssigned);
    }
    
    // Create assignment
    let assignment_id = Uuid::now_v7();
    sqlx::query(
        r#"
        INSERT INTO task_assignments 
        (assignment_id, task_id, step_id, user_id, status, assigned_at)
        VALUES (\$1, \$2, \$3, \$4, assigned, NOW())
        "#
    )
    .bind(assignment_id)
    .bind(task_id)
    .bind(step_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;
    
    // Update task version (optimistic lock)
    let rows = sqlx::query(
        r#"
        UPDATE tasks 
        SET status = assigned, version = version + 1, updated_at = NOW()
        WHERE task_id = \$1 AND version = \$2
        "#
    )
    .bind(task_id)
    .bind(version)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    
    if rows == 0 {
        // Concurrent modification - rollback
        return Err(AssignmentError::TaskNotAvailable(task_id));
    }
    
    tx.commit().await?;
    
    // Return the created assignment
    // ... fetch and return
    todo!()
}
\`\`\`

---

## Accept/Reject Flow

### Reject Reasons

Per CONTEXT.md: Predefined options with optional free-text.

\`\`\`rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RejectReason {
    /// Conflict of interest
    ConflictOfInterest,
    /// Instructions are unclear
    UnclearInstructions,
    /// Missing required context
    MissingContext,
    /// Outside area of expertise
    OutsideExpertise,
    /// Personal/schedule conflict
    ScheduleConflict,
    /// Technical issues with task data
    TechnicalIssues,
    /// Other (with custom reason)
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectRequest {
    pub assignment_id: Uuid,
    pub reason: RejectReason,
    pub additional_notes: Option<String>,
}
\`\`\`

---

## Queue API Design

### Endpoints

\`\`\`rust
pub fn queue_routes() -> Router {
    Router::new()
        // Get user task queue
        .route("/api/queue", get(get_my_queue))
        // Get queue statistics
        .route("/api/queue/stats", get(get_queue_stats))
        // WebSocket for real-time updates
        .route("/api/queue/ws", any(queue_websocket))
        // Accept a task
        .route("/api/queue/{assignment_id}/accept", post(accept_task))
        // Reject a task
        .route("/api/queue/{assignment_id}/reject", post(reject_task))
        // Pull mode: claim from pool
        .route("/api/queue/claim", post(claim_from_pool))
}
\`\`\`

### Queue Query Parameters

\`\`\`rust
#[derive(Debug, Deserialize)]
pub struct QueueQuery {
    /// Filter by project
    pub project_id: Option<Uuid>,
    /// Filter by task type (step type)
    pub task_type: Option<StepType>,
    /// Filter by priority level (high, medium, low)
    pub priority_level: Option<String>,
    /// Filter by date range
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    /// Sort field
    pub sort_by: Option<QueueSortField>,
    /// Sort direction
    pub sort_order: Option<SortOrder>,
    /// Pagination
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueueSortField {
    Priority,
    Age,
    Project,
    Deadline,
}
\`\`\`

### Queue Response

\`\`\`rust
#[derive(Debug, Serialize)]
pub struct QueueResponse {
    pub items: Vec<QueueItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize)]
pub struct QueueItem {
    pub assignment_id: Uuid,
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub project_name: String,
    pub step_id: String,
    pub step_type: StepType,
    pub status: AssignmentStatus,
    pub priority_score: f64,
    pub priority_indicator: PriorityIndicator,
    pub time_in_queue: i64, // milliseconds
    pub estimated_duration_minutes: Option<i32>,
    pub assigned_at: DateTime<Utc>,
    pub due_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PriorityIndicator {
    Urgent,   // Red
    High,     // Orange
    Normal,   // Blue
    Low,      // Gray
}

impl From<f64> for PriorityIndicator {
    fn from(score: f64) -> Self {
        match score {
            s if s >= 85.0 => Self::Urgent,
            s if s >= 65.0 => Self::High,
            s if s >= 35.0 => Self::Normal,
            _ => Self::Low,
        }
    }
}
\`\`\`

---

## Frontend Queue UI Patterns

### Virtual Scrolling for Large Queues

Using @tanstack/react-virtual for queues with 1000+ items:

\`\`\`tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function TaskQueue({ items }: { items: QueueItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Row height
    overscan: 10, // Render extra rows for smooth scrolling
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{ height: virtualizer.getTotalSize() }}
        className="relative"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <QueueRow
            key={virtualRow.key}
            item={items[virtualRow.index]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: \`translateY(\${virtualRow.start}px)\`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
\`\`\`

### Real-time Update Merge Strategy

Per CONTEXT.md: "Gentle merge - new items slide in, current view stays stable"

\`\`\`tsx
function useQueueWithRealtime(userId: string) {
  const queryClient = useQueryClient();
  
  // Initial fetch
  const { data, isLoading } = useQuery({
    queryKey: ["queue", userId],
    queryFn: () => fetchQueue(userId),
  });
  
  // WebSocket updates
  useEffect(() => {
    const ws = connectQueueWebSocket(userId);
    
    ws.onmessage = (event) => {
      const update: QueueEvent = JSON.parse(event.data);
      
      queryClient.setQueryData(["queue", userId], (old: QueueResponse) => {
        if (!old) return old;
        
        switch (update.type) {
          case "task_assigned":
            // Insert at correct position based on priority
            const insertIndex = old.items.findIndex(
              item => item.priority_score < update.priority
            );
            return {
              ...old,
              items: [
                ...old.items.slice(0, insertIndex),
                mapEventToItem(update),
                ...old.items.slice(insertIndex),
              ],
              total: old.total + 1,
            };
            
          case "task_unavailable":
            // Remove item with toast notification
            showToast("Task no longer available", "warning");
            return {
              ...old,
              items: old.items.filter(i => i.task_id !== update.task_id),
              total: old.total - 1,
            };
            
          case "priority_shifted":
            // Re-sort affected item
            const items = [...old.items];
            const idx = items.findIndex(i => i.task_id === update.task_id);
            if (idx !== -1) {
              items[idx] = { ...items[idx], priority_score: update.new_priority };
              items.sort((a, b) => b.priority_score - a.priority_score);
            }
            return { ...old, items };
            
          default:
            return old;
        }
      });
    };
    
    return () => ws.close();
  }, [userId, queryClient]);
  
  return { data, isLoading };
}
\`\`\`

### Race Condition Handling - Toast Pattern

\`\`\`tsx
function TaskAcceptButton({ assignmentId }: { assignmentId: string }) {
  const acceptMutation = useMutation({
    mutationFn: () => acceptTask(assignmentId),
    onSuccess: () => {
      // Navigate to annotation interface
      navigate(\`/annotate/\${assignmentId}\`);
    },
    onError: (error: ApiError) => {
      if (error.code === "TASK_UNAVAILABLE") {
        toast({
          title: "Task no longer available",
          description: "This task was claimed by another annotator.",
          variant: "warning",
        });
        // Refresh queue
        queryClient.invalidateQueries(["queue"]);
      } else {
        toast({
          title: "Failed to accept task",
          description: error.message,
          variant: "error",
        });
      }
    },
  });
  
  return (
    <Button 
      onClick={() => acceptMutation.mutate()}
      disabled={acceptMutation.isPending}
    >
      {acceptMutation.isPending ? "Accepting..." : "Accept"}
    </Button>
  );
}
\`\`\`

### Presence Indicators

Per CONTEXT.md: Project-level visibility with user chips.

\`\`\`tsx
function ProjectPresence({ projectId }: { projectId: string }) {
  const { data: presence } = useQuery({
    queryKey: ["presence", projectId],
    queryFn: () => fetchProjectPresence(projectId),
    refetchInterval: 30000, // Poll every 30s as backup
  });
  
  if (!presence?.length) return null;
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Active:</span>
      <div className="flex -space-x-2">
        {presence.slice(0, 5).map((user) => (
          <Avatar key={user.user_id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
          </Avatar>
        ))}
        {presence.length > 5 && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
            +{presence.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
\`\`\`

---

## Database Schema Additions

### New Tables

\`\`\`sql
-- Task cooldown tracking (for reject flow)
ALTER TABLE tasks ADD COLUMN cooldown_until TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN version BIGINT NOT NULL DEFAULT 1;

-- Assignment rejection tracking
ALTER TABLE task_assignments ADD COLUMN reject_reason JSONB;
ALTER TABLE task_assignments ADD COLUMN rejected_at TIMESTAMPTZ;

-- User presence tracking
CREATE TABLE user_presence (
    user_id UUID NOT NULL REFERENCES users(user_id),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- Index for presence queries
CREATE INDEX idx_presence_project ON user_presence(project_id, last_seen_at DESC);

-- Queue statistics (denormalized for performance)
CREATE TABLE queue_stats (
    user_id UUID PRIMARY KEY REFERENCES users(user_id),
    total_pending INT NOT NULL DEFAULT 0,
    total_in_progress INT NOT NULL DEFAULT 0,
    by_project JSONB NOT NULL DEFAULT {},
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
\`\`\`

### Indexing Strategy

\`\`\`sql
-- Fast queue queries
CREATE INDEX idx_assignments_user_queue ON task_assignments(user_id, status)
    WHERE status IN (assigned, accepted, in_progress);

-- Priority-based ordering
CREATE INDEX idx_tasks_priority ON tasks(priority DESC, created_at ASC)
    WHERE status = pending;

-- Cooldown lookup
CREATE INDEX idx_tasks_cooldown ON tasks(cooldown_until)
    WHERE cooldown_until IS NOT NULL AND cooldown_until > NOW();

-- Cross-step exclusion check
CREATE INDEX idx_assignments_task_user ON task_assignments(task_id, user_id);
\`\`\`

---

## Do Not Hand-Roll

| Problem | Solution |
|---------|----------|
| WebSocket connection management | Use axum::extract::ws + tokio::sync::broadcast |
| Priority queue sorting | Use SQL ORDER BY with composite index, not in-memory |
| Virtual scrolling | Use @tanstack/react-virtual, do not build custom |
| Optimistic locking | Use PostgreSQL FOR UPDATE NOWAIT + version column |
| Exponential backoff | Use existing backoff crate (already in deps) |
| Toast notifications | Use existing Radix UI toast (already in deps) |

---

## Testing Considerations

### Unit Tests

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_priority_calculation_overdue_task() {
        let task = Task {
            due_at: Some(Utc::now() - chrono::Duration::hours(1)),
            created_at: Utc::now() - chrono::Duration::days(1),
            ..Default::default()
        };
        let project = Project { priority: 50, ..Default::default() };
        let rule = PriorityRule::default();
        
        let score = calculate_task_priority(&task, &project, &rule, Utc::now());
        
        // Overdue should get high priority
        assert!(score > 70.0);
    }
    
    #[test]
    fn test_cross_step_exclusion_default() {
        let config = CrossStepExclusionConfig {
            default_exclude: true,
            exclusion_pairs: vec![],
            allow_pairs: vec![],
        };
        
        assert!(config.is_excluded("annotate", "review"));
    }
}
\`\`\`

### Integration Tests

- Test concurrent task claiming (race condition)
- Test WebSocket reconnection
- Test queue updates propagation
- Test reject cooldown timing

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| WebSocket library | Use built-in axum::extract::ws (already in deps) |
| Broadcast mechanism | tokio::sync::broadcast for multi-consumer |
| Virtual scrolling library | @tanstack/react-virtual (add to deps) |
| Priority formula | Composite weighted scoring per CONTEXT.md |
| Cooldown implementation | Task-level cooldown_until timestamp |

---

## References

- [Axum WebSocket Documentation](https://docs.rs/axum/latest/axum/extract/ws/index.html)
- [Tokio Broadcast Channel](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Taskwarrior Urgency Algorithm](https://taskwarrior.org/docs/urgency/)
- [Priority Weighted Round Robin Algorithm](https://par.nsf.gov/servlets/purl/10383232)
- [Skill-Based Task Assignment (SATA-PAW Framework)](https://www.sciencedirect.com/science/article/abs/pii/S157411922500001X)

---

*Research complete. Ready for planning.*
