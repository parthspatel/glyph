# Data Annotation Platform Requirements Specification

## 1. Overview

### 1.1 Purpose
A customizable, workflow-driven data annotation platform supporting complex multi-step annotation processes with configurable layouts, RBAC, quality management, and extensibility hooks.

### 1.2 Key Design Principles
- **Configuration over code**: Core workflows configurable without deployment
- **Extensibility**: Plugin architecture for custom components and hooks
- **Quality-first**: Built-in quality metrics and adjudication workflows
- **Scalability**: Support for large distributed annotation teams
- **Auditability**: Full lineage tracking for compliance requirements

---

## 2. User & Team Management

### 2.1 User Model

```
User
├── identity
│   ├── user_id: UUID
│   ├── email: string
│   ├── display_name: string
│   └── status: enum(active, inactive, suspended)
├── skills: Skill[]
├── roles: Role[]
├── team_memberships: TeamMembership[]
├── quality_profile: QualityProfile
└── availability: AvailabilityConfig
```

#### 2.1.1 Skills
Skills represent domain expertise and annotation capabilities.

| Field | Type | Description |
|-------|------|-------------|
| skill_id | UUID | Unique identifier |
| name | string | Skill name (e.g., "medical_coding", "ner_extraction") |
| category | string | Grouping category |
| proficiency_level | enum | novice, intermediate, advanced, expert |
| certified_at | timestamp | When skill was certified |
| expires_at | timestamp | Optional expiration for recertification |
| certifier_id | UUID | User who certified the skill |

#### 2.1.2 Roles
Roles define permissions and responsibilities within the system.

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| annotator | Performs annotation tasks | view_assigned_tasks, submit_annotations |
| reviewer | Reviews annotations for quality | view_team_tasks, approve_reject_annotations |
| adjudicator | Resolves annotation conflicts | view_conflicts, resolve_conflicts, override_annotations |
| team_lead | Manages team operations | assign_tasks, view_team_metrics, manage_team_skills |
| team_manager | Strategic team management | manage_team_composition, set_targets, escalate_issues |
| project_admin | Configures projects | create_projects, configure_workflows, manage_layouts |
| system_admin | Platform administration | all_permissions |

#### 2.1.3 RBAC Permission Model

```
Permission
├── permission_id: UUID
├── resource_type: enum(task, project, team, user, report, config)
├── action: enum(create, read, update, delete, assign, approve, export)
├── scope: enum(own, team, project, global)
└── conditions: Condition[]  # Optional attribute-based conditions
```

**Role-Permission Assignment:**
- Roles aggregate permissions
- Users inherit permissions from all assigned roles
- Permissions are additive (no explicit denies at role level)
- Scope narrowing: Global role + project assignment = project-scoped permissions

### 2.2 Team Model

```
Team
├── team_id: UUID
├── name: string
├── description: string
├── skills: Skill[]  # Aggregate skills available in team
├── roles: TeamRole[]  # Team-specific role assignments
├── leader_id: UUID  # Reference to team lead user
├── manager_id: UUID  # Reference to team manager user
├── members: TeamMembership[]
├── capacity: CapacityConfig
└── specializations: ProjectType[]  # Project types this team handles
```

#### 2.2.1 Team Membership

```
TeamMembership
├── user_id: UUID
├── team_id: UUID
├── team_role: enum(member, lead, manager)
├── allocation_percentage: float  # 0.0-1.0, how much of user's time is allocated
├── joined_at: timestamp
└── active: boolean
```

#### 2.2.2 Team Responsibilities

| Role | Knowledge Distribution | Task Management |
|------|----------------------|-----------------|
| Leader | Training coordination, skill gap analysis, mentorship assignment | Daily task prioritization, workload balancing, quality spot-checks |
| Manager | Capacity planning, hiring recommendations, cross-team coordination | SLA monitoring, escalation handling, resource allocation |

### 2.3 Automatic Assignment Rules

```
AssignmentRule
├── rule_id: UUID
├── priority: int  # Lower = higher priority
├── conditions
│   ├── required_skills: SkillRequirement[]
│   ├── required_roles: Role[]
│   ├── team_restrictions: UUID[]  # Optional team whitelist
│   ├── user_restrictions: UUID[]  # Optional user whitelist/blacklist
│   └── availability_check: boolean
├── scoring
│   ├── skill_match_weight: float
│   ├── quality_score_weight: float
│   ├── current_load_weight: float
│   └── round_robin_weight: float
└── constraints
    ├── max_tasks_per_user: int
    ├── prevent_duplicate_assignment: boolean  # For multi-annotation
    └── cool_off_period: duration  # Time before reassigning same task type
```

---

## 3. Project & Project Type Model

### 3.1 Project

```
Project
├── project_id: UUID
├── name: string
├── description: string
├── status: enum(draft, active, paused, completed, archived)
├── project_types: ProjectType[]
├── workflow_id: UUID
├── created_by: UUID
├── created_at: timestamp
├── targets: ProjectTarget
├── data_source: DataSourceConfig
└── settings: ProjectSettings
```

#### 3.1.1 Project Target

```
ProjectTarget
├── quantity_target: int  # Total tasks to complete
├── quality_target: float  # Minimum acceptable quality (0.0-1.0)
├── deadline: timestamp
├── throughput_target: float  # Tasks per hour/day
└── agreement_threshold: float  # For multi-annotation (e.g., 0.8 = 80% agreement)
```

### 3.2 Project Type

```
ProjectType
├── project_type_id: UUID
├── name: string
├── description: string
├── task_schema: JSONSchema  # Schema for task input data
├── annotation_schema: JSONSchema  # Schema for annotation output
├── required_skills: SkillRequirement[]
├── layout_id: UUID
├── estimated_duration: duration  # Average time per task
├── difficulty_level: enum(easy, medium, hard, expert)
└── quality_criteria: QualityCriteria
```

#### 3.2.1 Skill Requirement

```
SkillRequirement
├── skill_id: UUID
├── minimum_proficiency: enum(novice, intermediate, advanced, expert)
├── required: boolean  # vs. preferred
└── weight: float  # For assignment scoring
```

---

## 4. Workflow Engine

### 4.1 Workflow Model

```
Workflow
├── workflow_id: UUID
├── name: string
├── type: enum(single, multi_vote, multi_adjudication, custom)
├── steps: WorkflowStep[]
├── transitions: Transition[]
├── hooks: WorkflowHooks
└── settings: WorkflowSettings
```

### 4.2 Predefined Workflow Types

#### 4.2.1 Single Annotation
```
[Task] → [Annotate] → [Complete]
```
- One annotator per task
- Direct completion upon submission

#### 4.2.2 Multiple Annotations with Best Vote
```
[Task] → [Annotate x N] → [Vote/Consensus] → [Complete]
```
- N annotators independently annotate same task
- System calculates consensus (majority vote, weighted vote, etc.)
- Auto-completes if agreement threshold met
- Escalates to adjudication if threshold not met

#### 4.2.3 Multi-Annotation with Adjudication
```
[Task] → [Annotate x N] → [Agreement Check] → [Adjudicate] → [Complete]
                                    ↓
                              [Auto-Complete if agreed]
```
- N annotators independently annotate
- Agreement calculated
- Disagreements routed to adjudicator
- Adjudicator sees all annotations and makes final decision

#### 4.2.4 Custom Workflow
```
[Task] → [Step 1] → [Condition] → [Step 2a] → [Step 3] → [Complete]
                         ↓
                    [Step 2b] ────────────────────↗
```
- Arbitrary DAG of steps
- Conditional branching based on data or annotation values
- Parallel steps supported
- Custom merge logic

### 4.3 Workflow Step

```
WorkflowStep
├── step_id: UUID
├── name: string
├── type: enum(annotation, review, adjudication, auto_process, conditional)
├── layout_id: UUID
├── input_mapping: InputMapping  # Maps data to layout
├── output_mapping: OutputMapping  # Maps layout output to workflow data
├── assignment_config: StepAssignmentConfig
├── timeout: duration
├── retry_policy: RetryPolicy
└── hooks: StepHooks
```

#### 4.3.1 Step Assignment Config

```
StepAssignmentConfig
├── assignment_mode: enum(auto, manual, pool)
├── required_skills: SkillRequirement[]
├── required_roles: Role[]
├── annotators_required: int  # For multi-annotation steps
├── prevent_reassignment: boolean  # Don't assign same user from previous steps
├── team_restriction: UUID[]
└── load_balancing: enum(round_robin, least_loaded, quality_weighted)
```

### 4.4 Transitions

```
Transition
├── from_step_id: UUID
├── to_step_id: UUID
├── condition: TransitionCondition
└── priority: int  # For multiple matching transitions
```

```
TransitionCondition
├── type: enum(always, on_complete, on_agreement, on_disagreement, expression)
├── expression: string  # JSONPath or custom expression
├── threshold: float  # For agreement-based conditions
└── metadata: object
```

### 4.5 Preventing Duplicate Assignment

The scheduler MUST enforce:

1. **Within-Task Uniqueness**: For multi-annotation steps, each annotator assigned to a task must be unique
2. **Cross-Step Exclusion**: Configurable option to prevent users who annotated in step N from being assigned to review/adjudicate in step N+1
3. **Tracking Mechanism**:
   ```
   TaskAssignmentHistory
   ├── task_id: UUID
   ├── step_id: UUID
   ├── user_id: UUID
   ├── assigned_at: timestamp
   ├── completed_at: timestamp
   └── outcome: enum(completed, skipped, timed_out, reassigned)
   ```

---

## 5. Layout System

### 5.1 Layout Model

```
Layout
├── layout_id: UUID
├── name: string
├── version: int
├── project_type_id: UUID
├── step_id: UUID  # Which workflow step this layout is for
├── source: enum(custom, copy, inherit)
├── source_layout_id: UUID  # If copied/inherited
├── components: LayoutComponent[]
├── data_bindings: DataBinding[]
├── validation_rules: ValidationRule[]
└── settings: LayoutSettings
```

### 5.2 Layout Configuration

```
LayoutComponent
├── component_id: UUID
├── component_type: string  # Registry key (e.g., "core/text-input", "custom/ner-tagger")
├── instance_id: string  # Unique within layout
├── position: Position  # Grid or flex positioning
├── props: object  # Component-specific configuration
├── data_binding: string  # JSONPath to input data
├── output_key: string  # Key in annotation output
├── visibility_condition: string  # Expression for conditional rendering
└── children: LayoutComponent[]  # For container components
```

#### 5.2.1 Core Component Registry

| Component Type | Description | Props |
|---------------|-------------|-------|
| core/text-display | Read-only text display | format, highlight_ranges |
| core/text-input | Text input field | multiline, max_length, placeholder |
| core/text-area | Multi-line text input | rows, max_length |
| core/select | Dropdown selection | options, multiple, searchable |
| core/radio-group | Radio button group | options, layout |
| core/checkbox-group | Checkbox group | options, min_selected, max_selected |
| core/ner-tagger | Named entity recognition | entity_types, colors, allow_overlapping |
| core/relation-annotator | Relation annotation | relation_types, entity_source |
| core/bounding-box | Image bounding box | labels, min_boxes, max_boxes |
| core/classification | Multi-label classification | labels, hierarchical |
| core/comparison | Side-by-side comparison | sources, diff_mode |
| core/previous-annotation | Display previous step output | step_id, editable |
| core/agreement-display | Show annotation agreement | annotations, highlight_conflicts |
| core/json-editor | Structured JSON editing | schema, ui_schema |
| core/audio-player | Audio playback with regions | waveform, regions_enabled |
| core/video-player | Video playback with frames | frame_extraction, timeline |
| core/pdf-viewer | PDF document viewer | page_navigation, text_selection |
| core/markdown-display | Rendered markdown | allow_html |

### 5.3 Custom Components

#### 5.3.1 Component Interface

```typescript
interface AnnotationComponent<TInput, TOutput> {
  // Component metadata
  id: string;
  name: string;
  version: string;
  
  // Schema definitions
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  propsSchema: JSONSchema;
  
  // React component
  component: React.FC<ComponentProps<TInput, TOutput>>;
  
  // Optional hooks
  onMount?: (context: ComponentContext) => void;
  onUnmount?: (context: ComponentContext) => void;
  validate?: (output: TOutput) => ValidationResult;
}

interface ComponentProps<TInput, TOutput> {
  // Data
  input: TInput;
  value: TOutput;
  onChange: (value: TOutput) => void;
  
  // Context
  task: Task;
  step: WorkflowStep;
  previousAnnotations?: Annotation[];
  
  // Configuration
  props: object;
  readonly: boolean;
  
  // Services
  services: {
    ai: AIService;
    storage: StorageService;
    api: APIService;
  };
}
```

#### 5.3.2 Component Registration

```typescript
// Custom component example
const MedicalCodeSelector: AnnotationComponent<CodeInput, CodeOutput> = {
  id: 'ensemble/medical-code-selector',
  name: 'Medical Code Selector',
  version: '1.0.0',
  
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      suggested_codes: { type: 'array', items: { type: 'string' } }
    }
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      selected_codes: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number' }
    }
  },
  
  propsSchema: {
    type: 'object',
    properties: {
      code_system: { type: 'string', enum: ['ICD-10', 'CPT', 'HCPCS'] },
      max_codes: { type: 'number' },
      show_hierarchy: { type: 'boolean' }
    }
  },
  
  component: MedicalCodeSelectorComponent
};

// Registration
componentRegistry.register(MedicalCodeSelector);
```

### 5.4 Data Bindings

```
DataBinding
├── source: enum(task, previous_step, workflow_context, external)
├── source_step_id: UUID  # If source is previous_step
├── path: string  # JSONPath to data
├── target_component: string  # Component instance_id
├── target_prop: string  # Which prop to bind to
├── transform: TransformConfig  # Optional data transformation
└── default_value: any
```

### 5.5 Layout Inheritance & Copying

```
Layout Inheritance Rules:
1. COPY: Creates independent copy, no link to source
2. INHERIT: Maintains link, inherits changes, allows overrides
3. Override precedence: Local > Inherited
4. Component overrides tracked at instance_id level
```

```
LayoutInheritance
├── child_layout_id: UUID
├── parent_layout_id: UUID
├── override_mode: enum(replace, merge)
└── component_overrides: ComponentOverride[]
```

---

## 6. Task Management

### 6.1 Task Model

```
Task
├── task_id: UUID
├── project_id: UUID
├── project_type_id: UUID
├── status: enum(pending, assigned, in_progress, review, adjudication, completed, cancelled)
├── priority: int
├── input_data: object  # Conforms to project_type.task_schema
├── workflow_state: WorkflowState
├── assignments: TaskAssignment[]
├── annotations: Annotation[]
├── quality_scores: QualityScore[]
├── created_at: timestamp
├── completed_at: timestamp
└── metadata: object
```

### 6.2 Workflow State

```
WorkflowState
├── current_step_id: UUID
├── step_states: Map<UUID, StepState>
├── context: object  # Accumulated workflow data
└── history: WorkflowEvent[]
```

```
StepState
├── status: enum(pending, active, completed, skipped)
├── started_at: timestamp
├── completed_at: timestamp
├── attempts: int
└── output: object
```

### 6.3 Task Assignment

```
TaskAssignment
├── assignment_id: UUID
├── task_id: UUID
├── step_id: UUID
├── user_id: UUID
├── status: enum(assigned, accepted, in_progress, submitted, expired, reassigned)
├── assigned_at: timestamp
├── accepted_at: timestamp
├── submitted_at: timestamp
├── time_spent: duration
└── assignment_metadata: object  # Why this user was assigned
```

### 6.4 Annotation

```
Annotation
├── annotation_id: UUID
├── task_id: UUID
├── step_id: UUID
├── user_id: UUID
├── assignment_id: UUID
├── data: object  # Conforms to project_type.annotation_schema
├── status: enum(draft, submitted, approved, rejected, superseded)
├── submitted_at: timestamp
├── version: int
└── audit_trail: AuditEntry[]
```

---

## 7. Quality Management

### 7.1 Quality Score Model

```
QualityScore
├── score_id: UUID
├── entity_type: enum(task, annotation, user, project)
├── entity_id: UUID
├── score_type: string  # e.g., "agreement", "accuracy", "consistency"
├── value: float  # 0.0 - 1.0
├── confidence: float  # Statistical confidence
├── sample_size: int
├── calculated_at: timestamp
└── calculation_metadata: object
```

### 7.2 Task Quality

```
TaskQuality
├── task_id: UUID
├── overall_score: float
├── agreement_score: float  # Inter-annotator agreement
├── confidence: float
├── conflict_areas: ConflictArea[]  # Specific disagreement points
└── final_annotation_id: UUID  # The "gold" annotation
```

```
ConflictArea
├── field_path: string  # JSONPath to conflicting field
├── values: AnnotationValue[]  # Different values from annotators
├── resolution: enum(majority_vote, adjudicated, unresolved)
├── resolved_value: any
└── resolved_by: UUID  # User who resolved, if adjudicated
```

### 7.3 User Quality

```
UserQuality
├── user_id: UUID
├── overall_score: float
├── metrics: Map<string, QualityMetric>
│   ├── accuracy: QualityMetric
│   ├── consistency: QualityMetric
│   ├── agreement_rate: QualityMetric
│   ├── speed: QualityMetric
│   └── [custom_metrics]: QualityMetric
├── by_project_type: Map<UUID, UserProjectTypeQuality>
├── trend: TrendData
└── last_updated: timestamp
```

```
QualityMetric
├── value: float
├── sample_size: int
├── std_deviation: float
├── percentile: float  # vs other users
└── trend: enum(improving, stable, declining)
```

### 7.4 Quality Calculation Methods

| Metric | Calculation | Use Case |
|--------|-------------|----------|
| Agreement Rate | % of annotations matching consensus | Multi-annotator tasks |
| Accuracy | Comparison against gold standard | When gold labels exist |
| Consistency | Self-agreement on duplicate tasks | Internal consistency check |
| Speed | Tasks per hour, adjusted for complexity | Throughput measurement |
| Rejection Rate | % of annotations rejected in review | Review workflows |
| Adjudication Rate | % of tasks requiring adjudication | Conflict frequency |

### 7.5 Quality-Based Actions

```
QualityRule
├── rule_id: UUID
├── name: string
├── trigger: QualityTrigger
├── action: QualityAction
└── enabled: boolean
```

```
QualityTrigger
├── metric: string
├── operator: enum(lt, lte, gt, gte, eq, change_by)
├── threshold: float
├── window: duration  # Rolling window for calculation
└── min_sample_size: int
```

```
QualityAction
├── type: enum(alert, restrict_assignment, require_review, notify_manager, retrain)
├── target: enum(user, team, project)
├── parameters: object
└── notification_config: NotificationConfig
```

---

## 8. Dashboard & Reporting

### 8.1 Dashboard Views

#### 8.1.1 User Dashboard
```
UserDashboard
├── user_summary
│   ├── quality_score: float
│   ├── volume_today: int
│   ├── volume_this_week: int
│   ├── active_tasks: int
│   └── pending_reviews: int
├── quality_breakdown
│   ├── by_project_type: Chart
│   ├── trend_30_days: Chart
│   └── vs_team_average: Comparison
├── volume_breakdown
│   ├── by_project_type: Chart
│   ├── by_day: Chart
│   └── vs_target: Progress
└── recent_feedback: Feedback[]
```

#### 8.1.2 Team Dashboard
```
TeamDashboard
├── team_summary
│   ├── avg_quality_score: float
│   ├── total_volume_today: int
│   ├── active_members: int
│   ├── tasks_in_queue: int
│   └── sla_compliance: float
├── member_leaderboard
│   ├── by_quality: RankedList
│   └── by_volume: RankedList
├── quality_distribution: Histogram
├── workload_distribution: Chart
└── alerts: Alert[]
```

#### 8.1.3 Project Dashboard
```
ProjectDashboard
├── project_summary
│   ├── completion_percentage: float
│   ├── quality_score: float
│   ├── tasks_completed: int
│   ├── tasks_remaining: int
│   └── estimated_completion: timestamp
├── progress_chart: Chart
├── quality_trend: Chart
├── by_project_type: ProjectTypeSummary[]
├── bottlenecks
│   ├── steps_with_backlog: StepBacklog[]
│   └── users_at_capacity: User[]
└── adjudication_summary
    ├── total_conflicts: int
    ├── resolved: int
    └── common_conflict_types: ConflictType[]
```

#### 8.1.4 Executive Rollup
```
ExecutiveRollup
├── organization_summary
│   ├── total_tasks_completed: int
│   ├── overall_quality: float
│   ├── total_active_users: int
│   └── cost_per_task: float
├── by_project: ProjectSummary[]
├── by_team: TeamSummary[]
├── trends
│   ├── volume_trend: Chart
│   ├── quality_trend: Chart
│   └── efficiency_trend: Chart
└── alerts: CriticalAlert[]
```

### 8.2 Rollup Hierarchy

```
Organization
└── Teams
    └── Users

Projects
└── Project Types
    └── Tasks

Rollup Dimensions:
- Time: Hour → Day → Week → Month → Quarter → Year
- Entity: Task → Project Type → Project → Organization
- User: User → Team → Organization
```

### 8.3 Report Types

| Report | Description | Filters |
|--------|-------------|---------|
| Quality Report | Quality metrics over time | Date range, project, team, user |
| Volume Report | Throughput metrics | Date range, project, team, user |
| SLA Report | Target vs actual | Date range, project |
| User Performance | Individual contributor metrics | Date range, user |
| Adjudication Report | Conflict analysis | Date range, project, conflict type |
| Audit Report | Change log and actions | Date range, entity type, action type |

---

## 9. Extensibility & Hooks

### 9.1 Hook System Architecture

```
HookRegistry
├── workflow_hooks: WorkflowHook[]
├── step_hooks: StepHook[]
├── ui_hooks: UIHook[]
└── system_hooks: SystemHook[]
```

### 9.2 Workflow Hooks

```typescript
interface WorkflowHooks {
  // Lifecycle hooks
  onWorkflowStart?: (context: WorkflowContext) => Promise<void>;
  onWorkflowComplete?: (context: WorkflowContext) => Promise<void>;
  onWorkflowError?: (context: WorkflowContext, error: Error) => Promise<void>;
  
  // Transition hooks
  beforeTransition?: (from: Step, to: Step, context: WorkflowContext) => Promise<TransitionResult>;
  afterTransition?: (from: Step, to: Step, context: WorkflowContext) => Promise<void>;
}
```

### 9.3 Step Hooks

```typescript
interface StepHooks {
  // Pre-hooks: Execute before step starts
  preProcess?: PreProcessHook[];
  
  // Post-hooks: Execute after step completes
  postProcess?: PostProcessHook[];
  
  // Validation hooks
  validate?: ValidationHook[];
}

interface PreProcessHook {
  id: string;
  name: string;
  async: boolean;  // If true, runs in background
  handler: (context: StepContext) => Promise<PreProcessResult>;
}

interface PreProcessResult {
  // Modify input data
  inputModifications?: Partial<TaskInput>;
  
  // Prefill annotation
  prefillData?: Partial<Annotation>;
  
  // Add context for UI
  uiContext?: object;
  
  // Skip step (with reason)
  skip?: { reason: string; output: object };
}

interface PostProcessHook {
  id: string;
  name: string;
  async: boolean;
  handler: (context: StepContext, annotation: Annotation) => Promise<PostProcessResult>;
}

interface PostProcessResult {
  // Modify annotation before saving
  annotationModifications?: Partial<Annotation>;
  
  // Add to workflow context
  contextAdditions?: object;
  
  // Trigger additional actions
  actions?: Action[];
  
  // Override next step
  nextStepOverride?: UUID;
}
```

### 9.4 UI Hooks

```typescript
interface UIHooks {
  // Layout-level hooks
  onLayoutMount?: (context: LayoutContext) => void;
  onLayoutUnmount?: (context: LayoutContext) => void;
  
  // Component-level hooks
  onComponentChange?: (componentId: string, value: any, context: LayoutContext) => void;
  
  // AI integration hooks
  aiPrefill?: AIPrefillHook;
  aiAssist?: AIAssistHook;
  aiValidate?: AIValidateHook;
}

interface AIPrefillHook {
  enabled: boolean;
  model: string;
  prompt_template: string;
  target_fields: string[];  // Which fields to prefill
  confidence_threshold: float;  // Minimum confidence to auto-fill
  show_suggestions: boolean;  // Show as suggestions vs auto-fill
}

interface AIAssistHook {
  enabled: boolean;
  trigger: 'manual' | 'on_focus' | 'on_change';
  model: string;
  capabilities: ('suggest' | 'explain' | 'validate' | 'complete')[];
}
```

### 9.5 Hook Registration & Configuration

```yaml
# Example hook configuration
hooks:
  workflow:
    onWorkflowStart:
      - id: initialize-ml-context
        handler: "@ensemble/ml-context-initializer"
        config:
          model: clinical-ner-v2
          preload: true

  steps:
    annotation:
      preProcess:
        - id: ai-prefill
          handler: "@ensemble/ai-prefill"
          async: false
          config:
            model: gpt-4
            fields: ["diagnosis_codes", "procedure_codes"]
            confidence_threshold: 0.85
            
      postProcess:
        - id: quality-check
          handler: "@ensemble/auto-quality-check"
          async: true
          config:
            rules: ["completeness", "format", "consistency"]
            
        - id: external-validation
          handler: "@ensemble/external-api-validator"
          async: true
          config:
            endpoint: "https://validation.example.com/validate"
            timeout: 5000

  ui:
    aiAssist:
      enabled: true
      trigger: manual
      model: claude-sonnet
      capabilities: [suggest, explain]
```

### 9.6 Built-in Hook Library

| Hook | Type | Description |
|------|------|-------------|
| ai-prefill | PreProcess | Uses AI to prefill annotation fields |
| ai-validate | PostProcess | AI-powered validation of annotations |
| external-api | Pre/Post | Calls external API with task/annotation data |
| ml-inference | PreProcess | Runs ML model for predictions |
| data-enrichment | PreProcess | Enriches input data from external sources |
| auto-quality | PostProcess | Calculates quality metrics automatically |
| audit-log | PostProcess | Logs to external audit system |
| notification | PostProcess | Sends notifications based on conditions |
| export-trigger | PostProcess | Triggers export on completion |

### 9.7 Interactive Layout Hooks

```typescript
interface InteractiveHooks {
  // Real-time AI assistance
  onFieldFocus: (field: string, context: LayoutContext) => Promise<Suggestions>;
  onFieldChange: (field: string, value: any, context: LayoutContext) => Promise<Validation>;
  onFieldBlur: (field: string, value: any, context: LayoutContext) => Promise<void>;
  
  // Cross-field interactions
  onDependentFieldChange: (trigger: string, dependents: string[], context: LayoutContext) => Promise<Updates>;
  
  // External data fetching
  onLookupRequest: (query: string, field: string, context: LayoutContext) => Promise<LookupResults>;
}

// Example: Live code lookup
const codeLookupHook: InteractiveHooks = {
  onLookupRequest: async (query, field, context) => {
    if (field === 'icd_code') {
      const results = await context.services.api.searchCodes({
        system: 'ICD-10',
        query: query,
        limit: 10
      });
      return {
        suggestions: results.map(r => ({
          value: r.code,
          label: `${r.code} - ${r.description}`,
          metadata: r
        }))
      };
    }
  }
};
```

---

## 10. Integration & API

### 10.1 REST API Endpoints

```
/api/v1/
├── /users
│   ├── GET /                    # List users
│   ├── POST /                   # Create user
│   ├── GET /{id}                # Get user
│   ├── PUT /{id}                # Update user
│   ├── GET /{id}/quality        # Get user quality metrics
│   └── GET /{id}/assignments    # Get user assignments
│
├── /teams
│   ├── GET /                    # List teams
│   ├── POST /                   # Create team
│   ├── GET /{id}                # Get team
│   ├── PUT /{id}                # Update team
│   ├── GET /{id}/members        # Get team members
│   └── GET /{id}/dashboard      # Get team dashboard
│
├── /projects
│   ├── GET /                    # List projects
│   ├── POST /                   # Create project
│   ├── GET /{id}                # Get project
│   ├── PUT /{id}                # Update project
│   ├── GET /{id}/dashboard      # Get project dashboard
│   ├── POST /{id}/tasks         # Bulk create tasks
│   └── GET /{id}/export         # Export project data
│
├── /tasks
│   ├── GET /                    # List/search tasks
│   ├── POST /                   # Create task
│   ├── GET /{id}                # Get task
│   ├── PUT /{id}                # Update task
│   ├── GET /{id}/annotations    # Get task annotations
│   └── POST /{id}/assign        # Assign task
│
├── /annotations
│   ├── GET /{id}                # Get annotation
│   ├── PUT /{id}                # Update annotation
│   └── POST /{id}/submit        # Submit annotation
│
├── /workflows
│   ├── GET /                    # List workflows
│   ├── POST /                   # Create workflow
│   ├── GET /{id}                # Get workflow
│   └── PUT /{id}                # Update workflow
│
├── /layouts
│   ├── GET /                    # List layouts
│   ├── POST /                   # Create layout
│   ├── GET /{id}                # Get layout
│   ├── PUT /{id}                # Update layout
│   └── GET /{id}/preview        # Preview layout
│
├── /hooks
│   ├── GET /                    # List registered hooks
│   ├── POST /register           # Register custom hook
│   └── DELETE /{id}             # Unregister hook
│
├── /reports
│   ├── GET /quality             # Quality reports
│   ├── GET /volume              # Volume reports
│   └── GET /audit               # Audit reports
│
└── /components
    ├── GET /                    # List registered components
    └── POST /register           # Register custom component
```

### 10.2 Event System

```
Events (for webhooks/streaming):
├── task.created
├── task.assigned
├── task.completed
├── annotation.submitted
├── annotation.approved
├── annotation.rejected
├── workflow.step.completed
├── workflow.completed
├── quality.threshold.breached
└── user.quality.changed
```

### 10.3 Webhook Configuration

```
Webhook
├── webhook_id: UUID
├── name: string
├── url: string
├── events: string[]
├── headers: Map<string, string>
├── secret: string  # For signature verification
├── retry_policy: RetryPolicy
└── enabled: boolean
```

---

## 11. Security & Compliance

### 11.1 Authentication
- SSO integration (SAML 2.0, OIDC)
- API key authentication for service accounts
- JWT tokens for session management
- MFA support

### 11.2 Authorization
- RBAC as defined in Section 2
- Resource-level permissions
- API scopes for external integrations

### 11.3 Audit Logging

```
AuditLog
├── log_id: UUID
├── timestamp: timestamp
├── actor_id: UUID
├── actor_type: enum(user, system, api_key)
├── action: string
├── resource_type: string
├── resource_id: UUID
├── changes: object  # Before/after for updates
├── ip_address: string
├── user_agent: string
└── metadata: object
```

### 11.4 Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII field-level encryption
- Data retention policies
- Right to deletion support

### 11.5 Compliance Features
- HIPAA-compatible audit trails
- Data lineage tracking
- Access logging
- Configurable data retention
- Export capabilities for audits

---

## 12. Non-Functional Requirements

### 12.1 Performance
- Task assignment: < 100ms
- Layout rendering: < 500ms
- Annotation submission: < 200ms
- Dashboard load: < 2s
- Support 10,000+ concurrent users

### 12.2 Scalability
- Horizontal scaling for API servers
- Queue-based task distribution
- Partitioned data storage
- CDN for static assets

### 12.3 Availability
- 99.9% uptime SLA
- Graceful degradation
- Multi-region deployment option
- Automated failover

### 12.4 Observability
- Structured logging
- Distributed tracing
- Metrics collection
- Alerting integration

---

## 13. Technical Architecture

### 13.1 Technology Stack Overview

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Backend | Rust | Performance, memory safety, strong typing, WASM compilation support |
| Frontend | TypeScript + React | Type safety, component ecosystem, developer productivity |
| Plugin Runtime | JS (V8/Deno) + WASM | Flexibility for plugin authors, sandboxed execution |
| API | REST + WebSocket | REST for CRUD, WebSocket for real-time updates |
| Database | PostgreSQL | ACID compliance, JSONB support, proven at scale |
| Cache | Redis | Session management, task queue, real-time pub/sub |
| Search | Meilisearch | Full-text search, typo tolerance, fast indexing |
| Message Queue | NATS | Lightweight, high-performance event distribution |
| Object Storage | S3-compatible | Document/image storage for annotation assets |

### 13.2 Backend Architecture (Rust)

#### 13.2.1 Core Dependencies

```toml
# Cargo.toml

[package]
name = "annotation-platform"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web Framework
axum = { version = "0.7", features = ["ws", "multipart"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip", "request-id"] }
hyper = { version = "1", features = ["full"] }

# Async Runtime
tokio = { version = "1", features = ["full"] }
futures = "0.3"
async-trait = "0.1"

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono", "json", "migrate"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
typeshare = "1"  # Generate TypeScript types from Rust structs

# Validation
validator = { version = "0.16", features = ["derive"] }

# Authentication/Authorization
jsonwebtoken = "9"
argon2 = "0.5"
oauth2 = "4"

# Plugin System - WASM
wasmtime = "17"
wasmtime-wasi = "17"
wit-bindgen = "0.17"

# Plugin System - JavaScript
deno_core = "0.251"

# Error Handling
thiserror = "1"
anyhow = "1"

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
tracing-opentelemetry = "0.22"
metrics = "0.22"
metrics-exporter-prometheus = "0.13"

# Background Jobs & Messaging
async-nats = "0.33"
tokio-cron-scheduler = "0.10"

# Caching
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }

# Utilities
uuid = { version = "1", features = ["v4", "v7", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
url = "2"
base64 = "0.21"
jsonschema = "0.17"  # JSON Schema validation for layouts
jsonpath-rust = "0.5"  # JSONPath for data bindings

[dev-dependencies]
mockall = "0.12"
wiremock = "0.5"
fake = { version = "2", features = ["derive"] }
rstest = "0.18"
testcontainers = "0.15"
```

#### 13.2.2 Project Structure

```
annotation-platform/
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
│
├── crates/
│   ├── api/                          # HTTP API layer
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── routes/
│   │       │   ├── mod.rs
│   │       │   ├── users.rs
│   │       │   ├── teams.rs
│   │       │   ├── projects.rs
│   │       │   ├── tasks.rs
│   │       │   ├── annotations.rs
│   │       │   ├── workflows.rs
│   │       │   ├── layouts.rs
│   │       │   ├── plugins.rs
│   │       │   └── reports.rs
│   │       ├── middleware/
│   │       │   ├── mod.rs
│   │       │   ├── auth.rs
│   │       │   ├── rbac.rs
│   │       │   ├── rate_limit.rs
│   │       │   └── audit.rs
│   │       ├── extractors.rs
│   │       ├── error.rs
│   │       └── websocket.rs
│   │
│   ├── domain/                       # Core business logic
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── users/
│   │       │   ├── mod.rs
│   │       │   ├── model.rs
│   │       │   ├── service.rs
│   │       │   └── repository.rs
│   │       ├── teams/
│   │       ├── projects/
│   │       ├── tasks/
│   │       ├── annotations/
│   │       ├── workflows/
│   │       │   ├── mod.rs
│   │       │   ├── model.rs
│   │       │   ├── engine.rs         # Workflow state machine
│   │       │   ├── scheduler.rs      # Task assignment logic
│   │       │   └── transitions.rs
│   │       ├── layouts/
│   │       │   ├── mod.rs
│   │       │   ├── model.rs
│   │       │   ├── validator.rs
│   │       │   └── renderer.rs
│   │       └── quality/
│   │           ├── mod.rs
│   │           ├── calculator.rs
│   │           ├── agreement.rs
│   │           └── metrics.rs
│   │
│   ├── plugins/                      # Plugin runtime system
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── runtime/
│   │       │   ├── mod.rs
│   │       │   ├── wasm.rs           # WASM plugin executor
│   │       │   ├── javascript.rs     # JS plugin executor (Deno)
│   │       │   └── sandbox.rs
│   │       ├── registry.rs
│   │       ├── loader.rs
│   │       ├── types.rs
│   │       └── builtin/
│   │           ├── mod.rs
│   │           ├── ai_prefill.rs
│   │           ├── quality_check.rs
│   │           └── webhook.rs
│   │
│   ├── infrastructure/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── db/
│   │       │   ├── mod.rs
│   │       │   └── postgres.rs
│   │       ├── cache.rs
│   │       ├── queue.rs
│   │       ├── storage.rs
│   │       └── search.rs
│   │
│   ├── shared/                       # Shared types & utilities
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── types.rs              # Core types with typeshare
│   │       ├── pagination.rs
│   │       ├── error.rs
│   │       └── config.rs
│   │
│   └── cli/
│       ├── Cargo.toml
│       └── src/
│           └── main.rs
│
├── migrations/
│   └── *.sql
│
├── plugins/                          # Plugin SDK & examples
│   ├── sdk-rust/
│   ├── sdk-typescript/
│   └── examples/
│
└── wit/                              # WebAssembly Interface Types
    └── plugin.wit
```

#### 13.2.3 Shared Types with TypeScript Generation

```rust
// crates/shared/src/types.rs
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub status: UserStatus,
    pub skills: Vec<UserSkill>,
    pub roles: Vec<Role>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Uuid,
    pub project_id: Uuid,
    pub project_type_id: Uuid,
    pub status: TaskStatus,
    pub priority: i32,
    pub input_data: serde_json::Value,
    pub workflow_state: WorkflowState,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    pub id: Uuid,
    pub task_id: Uuid,
    pub step_id: Uuid,
    pub user_id: Uuid,
    pub data: serde_json::Value,
    pub status: AnnotationStatus,
    pub submitted_at: Option<DateTime<Utc>>,
    pub version: i32,
}
```

Build script to generate TypeScript types:
```bash
# scripts/generate-types.sh
typeshare ./crates/shared/src --lang=typescript --output-file=../frontend/src/types/generated.ts
```

### 13.3 Frontend Architecture (TypeScript + React)

#### 13.3.1 Dependencies

```json
{
  "name": "annotation-platform-frontend",
  "version": "0.1.0",
  "type": "module",
  
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    
    "@tanstack/react-query": "^5.8.0",
    "@tanstack/react-table": "^8.10.0",
    
    "zustand": "^4.4.0",
    "immer": "^10.0.0",
    
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-tabs": "latest",
    "tailwindcss": "^3.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    
    "recharts": "^2.10.0",
    
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",
    
    "monaco-editor": "^0.44.0",
    "@monaco-editor/react": "^4.6.0",
    
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0"
  },
  
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react-swc": "^3.5.0",
    
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.0",
    "msw": "^2.0.0",
    
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    
    "storybook": "^7.5.0"
  }
}
```

#### 13.3.2 Frontend Project Structure

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
│
├── public/
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── types/
│   │   ├── generated.ts           # Auto-generated from Rust types
│   │   ├── index.ts
│   │   └── extensions.ts
│   │
│   ├── api/
│   │   ├── client.ts
│   │   ├── websocket.ts
│   │   ├── hooks/
│   │   │   ├── useUsers.ts
│   │   │   ├── useTeams.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useAnnotations.ts
│   │   │   └── useReports.ts
│   │   └── queries/
│   │       └── keys.ts
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── annotationStore.ts
│   │   ├── layoutStore.ts
│   │   └── uiStore.ts
│   │
│   ├── components/
│   │   ├── ui/                    # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── annotation/
│   │   │   ├── AnnotationWorkspace.tsx
│   │   │   ├── TaskQueue.tsx
│   │   │   ├── AnnotationToolbar.tsx
│   │   │   └── SubmitPanel.tsx
│   │   │
│   │   ├── workflow/
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   └── StepConfigPanel.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── QualityMetrics.tsx
│   │   │   ├── VolumeCharts.tsx
│   │   │   ├── UserLeaderboard.tsx
│   │   │   └── ProjectProgress.tsx
│   │   │
│   │   └── admin/
│   │       ├── UserManagement.tsx
│   │       ├── TeamManagement.tsx
│   │       └── ProjectConfig.tsx
│   │
│   ├── features/
│   │   ├── annotation/
│   │   │   ├── pages/
│   │   │   │   ├── AnnotationPage.tsx
│   │   │   │   ├── AdjudicationPage.tsx
│   │   │   │   └── ReviewPage.tsx
│   │   │   └── hooks/
│   │   │       ├── useAnnotationSession.ts
│   │   │       └── useTaskNavigation.ts
│   │   ├── projects/
│   │   ├── workflows/
│   │   ├── layouts/
│   │   ├── reports/
│   │   └── admin/
│   │
│   ├── layouts/                   # Dynamic layout system
│   │   ├── LayoutRenderer.tsx
│   │   ├── ComponentRegistry.tsx
│   │   ├── DataBindingContext.tsx
│   │   │
│   │   ├── core/                  # Core annotation components
│   │   │   ├── TextDisplay.tsx
│   │   │   ├── TextInput.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── NERTagger.tsx
│   │   │   ├── RelationAnnotator.tsx
│   │   │   ├── BoundingBox.tsx
│   │   │   ├── Classification.tsx
│   │   │   ├── Comparison.tsx
│   │   │   ├── PreviousAnnotation.tsx
│   │   │   ├── AgreementDisplay.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── builder/
│   │       ├── LayoutBuilder.tsx
│   │       ├── ComponentPalette.tsx
│   │       ├── PropertyEditor.tsx
│   │       └── PreviewPane.tsx
│   │
│   ├── plugins/                   # Frontend plugin system
│   │   ├── PluginHost.tsx
│   │   ├── PluginLoader.ts
│   │   ├── PluginSandbox.ts
│   │   ├── WasmComponentLoader.ts
│   │   ├── types.ts
│   │   └── hooks/
│   │       ├── usePlugin.ts
│   │       └── usePluginEvent.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useWebSocket.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── utils/
│   │   ├── jsonpath.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   │
│   └── routes/
│       └── index.tsx
│
├── .storybook/
└── tests/
    ├── setup.ts
    └── mocks/
```

### 13.4 Plugin System Architecture

#### 13.4.1 Plugin Types & Capabilities

| Plugin Type | Runtime | Execution Context | Use Cases |
|-------------|---------|-------------------|-----------|
| Backend Hook | WASM or JS | Server-side, sandboxed | Pre/post processing, validation, external API calls |
| UI Component | JS (React) or WASM | Browser, sandboxed | Custom annotation components |
| UI Hook | JS | Browser, controlled API | AI assist, live validation, data enrichment |
| Workflow Action | WASM or JS | Server-side, sandboxed | Custom workflow steps, conditional logic |

#### 13.4.2 WebAssembly Interface Types (WIT)

```wit
// wit/plugin.wit

package annotation:plugin@0.1.0;

interface types {
    record task {
        id: string,
        project-id: string,
        input-data: string,  // JSON
        metadata: string,    // JSON
    }
    
    record annotation {
        id: string,
        task-id: string,
        step-id: string,
        user-id: string,
        data: string,  // JSON
        status: annotation-status,
    }
    
    enum annotation-status {
        draft,
        submitted,
        approved,
        rejected,
    }
    
    record step-context {
        step-id: string,
        step-name: string,
        workflow-id: string,
        previous-annotations: list<annotation>,
        workflow-context: string,  // JSON
    }
}

interface pre-process-hook {
    use types.{task, step-context};
    
    record pre-process-output {
        input-modifications: option<string>,  // JSON patch
        prefill-data: option<string>,         // JSON
        ui-context: option<string>,           // JSON
        skip: option<skip-directive>,
    }
    
    record skip-directive {
        reason: string,
        output: string,  // JSON
    }
    
    process: func(task: task, context: step-context, config: string) -> result<pre-process-output, string>;
}

interface post-process-hook {
    use types.{task, annotation, step-context};
    
    record post-process-output {
        annotation-modifications: option<string>,
        context-additions: option<string>,
        next-step-override: option<string>,
        actions: list<action>,
    }
    
    record action {
        action-type: string,
        parameters: string,  // JSON
    }
    
    process: func(task: task, annotation: annotation, context: step-context, config: string) -> result<post-process-output, string>;
}

interface validation-hook {
    use types.{task, annotation, step-context};
    
    record validation-result {
        valid: bool,
        errors: list<validation-error>,
        warnings: list<validation-warning>,
    }
    
    record validation-error {
        field: string,
        message: string,
        code: string,
    }
    
    record validation-warning {
        field: string,
        message: string,
    }
    
    validate: func(task: task, annotation: annotation, context: step-context, config: string) -> validation-result;
}

// Host functions available to plugins
interface host {
    // Logging
    log-info: func(message: string);
    log-warn: func(message: string);
    log-error: func(message: string);
    
    // HTTP (allowlisted endpoints only)
    http-get: func(url: string, headers: list<tuple<string, string>>) -> result<string, string>;
    http-post: func(url: string, body: string, headers: list<tuple<string, string>>) -> result<string, string>;
    
    // Storage (plugin-scoped key-value)
    storage-get: func(key: string) -> option<string>;
    storage-set: func(key: string, value: string);
    storage-delete: func(key: string);
    
    // Secrets (read-only, configured per-plugin)
    get-secret: func(name: string) -> option<string>;
}

world backend-plugin {
    import host;
    export pre-process-hook;
    export post-process-hook;
    export validation-hook;
}
```

#### 13.4.3 WASM Plugin Runtime (Rust Backend)

```rust
// crates/plugins/src/runtime/wasm.rs

use wasmtime::*;
use wasmtime_wasi::WasiCtxBuilder;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct WasmPluginRuntime {
    engine: Engine,
    linker: Linker<PluginState>,
    plugin_cache: Arc<RwLock<HashMap<String, Module>>>,
    config: WasmRuntimeConfig,
}

pub struct WasmRuntimeConfig {
    pub max_memory_bytes: usize,
    pub max_execution_time_ms: u64,
    pub allowed_hosts: Vec<String>,
    pub max_http_response_bytes: usize,
}

impl Default for WasmRuntimeConfig {
    fn default() -> Self {
        Self {
            max_memory_bytes: 64 * 1024 * 1024,  // 64MB
            max_execution_time_ms: 30_000,        // 30 seconds
            allowed_hosts: vec![],
            max_http_response_bytes: 10 * 1024 * 1024,  // 10MB
        }
    }
}

struct PluginState {
    wasi: wasmtime_wasi::WasiCtx,
    http_client: reqwest::Client,
    storage: Arc<dyn PluginStorage>,
    secrets: HashMap<String, String>,
    allowed_hosts: Vec<String>,
}

impl WasmPluginRuntime {
    pub fn new(config: WasmRuntimeConfig) -> Result<Self> {
        let mut engine_config = Config::new();
        engine_config.async_support(true);
        engine_config.consume_fuel(true);
        
        let engine = Engine::new(&engine_config)?;
        let mut linker = Linker::new(&engine);
        
        wasmtime_wasi::add_to_linker_async(&mut linker)?;
        Self::add_host_functions(&mut linker)?;
        
        Ok(Self {
            engine,
            linker,
            plugin_cache: Arc::new(RwLock::new(HashMap::new())),
            config,
        })
    }
    
    pub async fn execute_pre_process_hook(
        &self,
        plugin_id: &str,
        plugin_bytes: &[u8],
        task: &Task,
        context: &StepContext,
        config: &serde_json::Value,
    ) -> Result<PreProcessOutput> {
        let module = self.get_or_compile_module(plugin_id, plugin_bytes).await?;
        let mut store = self.create_store(plugin_id).await?;
        store.set_fuel(self.config.max_execution_time_ms * 1_000_000)?;
        
        let instance = self.linker.instantiate_async(&mut store, &module).await?;
        let process_func = instance.get_typed_func::<(String, String, String), String>(
            &mut store, "process"
        )?;
        
        let task_json = serde_json::to_string(task)?;
        let context_json = serde_json::to_string(context)?;
        let config_json = serde_json::to_string(config)?;
        
        let result_json = process_func
            .call_async(&mut store, (task_json, context_json, config_json))
            .await?;
        
        let output: PreProcessOutput = serde_json::from_str(&result_json)?;
        Ok(output)
    }
}
```

#### 13.4.4 JavaScript Plugin Runtime (Deno-based)

```rust
// crates/plugins/src/runtime/javascript.rs

use deno_core::{JsRuntime, RuntimeOptions, op2, OpState};
use std::rc::Rc;
use std::cell::RefCell;

pub struct JsPluginRuntime {
    config: JsRuntimeConfig,
}

pub struct JsRuntimeConfig {
    pub max_memory_bytes: usize,
    pub max_execution_time_ms: u64,
    pub allowed_hosts: Vec<String>,
}

impl JsPluginRuntime {
    pub fn new(config: JsRuntimeConfig) -> Self {
        Self { config }
    }
    
    pub async fn execute_pre_process_hook(
        &self,
        plugin_code: &str,
        task: &Task,
        context: &StepContext,
        config: &serde_json::Value,
    ) -> Result<PreProcessOutput> {
        let mut runtime = self.create_runtime().await?;
        
        // Inject the plugin code
        runtime.execute_script("<plugin>", plugin_code)?;
        
        // Prepare input data
        let input_json = serde_json::json!({
            "task": task,
            "context": context,
            "config": config
        });
        
        // Execute the hook
        let result = runtime.execute_script(
            "<invoke>",
            &format!(
                r#"
                (async () => {{
                    const input = {};
                    const result = await plugin.preProcess(input.task, input.context, input.config);
                    return JSON.stringify(result);
                }})()
                "#,
                serde_json::to_string(&input_json)?
            )
        )?;
        
        let result = tokio::time::timeout(
            std::time::Duration::from_millis(self.config.max_execution_time_ms),
            runtime.run_event_loop(false)
        ).await??;
        
        let output: PreProcessOutput = serde_json::from_str(&result)?;
        Ok(output)
    }
}

// Host function implementations as Deno ops
#[op2(async)]
async fn op_log_info(state: Rc<RefCell<OpState>>, message: String) {
    tracing::info!(plugin = "js", "{}", message);
}

#[op2(async)]
async fn op_http_get(
    state: Rc<RefCell<OpState>>,
    url: String,
    headers: Vec<(String, String)>,
) -> Result<String, deno_core::error::AnyError> {
    let config = state.borrow().borrow::<JsRuntimeConfig>().clone();
    
    // Validate allowed host
    let parsed_url = url::Url::parse(&url)?;
    let host = parsed_url.host_str().ok_or_else(|| anyhow::anyhow!("No host"))?;
    
    if !config.allowed_hosts.iter().any(|h| h == host || h == "*") {
        return Err(anyhow::anyhow!("Host not allowed: {}", host).into());
    }
    
    let client = reqwest::Client::new();
    let mut request = client.get(&url);
    for (key, value) in headers {
        request = request.header(&key, &value);
    }
    
    let response = request.send().await?;
    Ok(response.text().await?)
}

deno_core::extension!(
    annotation_plugin_ext,
    ops = [op_log_info, op_http_get, op_storage_get, op_storage_set, op_get_secret],
    esm = ["sdk/plugin-sdk.js"]
);
```

#### 13.4.5 TypeScript Plugin SDK

```typescript
// plugins/sdk-typescript/src/index.ts

export interface Task {
  id: string;
  projectId: string;
  projectTypeId: string;
  inputData: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Annotation {
  id: string;
  taskId: string;
  stepId: string;
  userId: string;
  data: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface StepContext {
  stepId: string;
  stepName: string;
  workflowId: string;
  previousAnnotations: Annotation[];
  workflowContext: Record<string, unknown>;
}

export interface PreProcessResult {
  inputModifications?: object;
  prefillData?: Record<string, unknown>;
  uiContext?: Record<string, unknown>;
  skip?: { reason: string; output: Record<string, unknown> };
}

export interface PostProcessResult {
  annotationModifications?: object;
  contextAdditions?: Record<string, unknown>;
  actions?: Array<{ type: string; parameters: Record<string, unknown> }>;
  nextStepOverride?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  
  preProcess?: (task: Task, context: StepContext, config: Record<string, unknown>) => Promise<PreProcessResult>;
  postProcess?: (task: Task, annotation: Annotation, context: StepContext, config: Record<string, unknown>) => Promise<PostProcessResult>;
  validate?: (task: Task, annotation: Annotation, context: StepContext, config: Record<string, unknown>) => Promise<ValidationResult>;
}

// Host API (injected by runtime)
declare global {
  const Host: {
    log: {
      info(message: string): void;
      warn(message: string): void;
      error(message: string): void;
    };
    http: {
      get(url: string, headers?: Record<string, string>): Promise<string>;
      post(url: string, body: string, headers?: Record<string, string>): Promise<string>;
    };
    storage: {
      get(key: string): Promise<string | null>;
      set(key: string, value: string): Promise<void>;
      delete(key: string): Promise<void>;
    };
    secrets: {
      get(name: string): string | null;
    };
  };
}

export function definePlugin(definition: PluginDefinition): void {
  (globalThis as any).plugin = definition;
}
```

#### 13.4.6 Example Plugins

**WASM Plugin (Rust):**
```rust
// plugins/examples/ai-prefill-wasm/src/lib.rs

use annotation_plugin_sdk::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Config {
    model: String,
    fields: Vec<String>,
    confidence_threshold: f64,
}

#[export_name = "process"]
pub fn pre_process(task_json: &str, context_json: &str, config_json: &str) -> String {
    let task: Task = serde_json::from_str(task_json).unwrap();
    let config: Config = serde_json::from_str(config_json).unwrap();
    
    let api_key = Host::secrets::get("OPENAI_API_KEY").unwrap_or_default();
    
    let prompt = format!(
        "Extract fields {:?} from: {}",
        config.fields,
        task.input_data.get("text").unwrap_or(&serde_json::Value::Null)
    );
    
    let response = Host::http::post(
        "https://api.openai.com/v1/chat/completions",
        &serde_json::json!({
            "model": config.model,
            "messages": [{"role": "user", "content": prompt}]
        }).to_string(),
        &[("Authorization", &format!("Bearer {}", api_key))].into(),
    ).unwrap();
    
    let predictions = parse_ai_response(&response, &config);
    let mut prefill = serde_json::Map::new();
    
    for pred in predictions {
        if pred.confidence >= config.confidence_threshold {
            prefill.insert(pred.field, pred.value);
        }
    }
    
    serde_json::to_string(&PreProcessOutput {
        prefill_data: Some(serde_json::Value::Object(prefill)),
        ..Default::default()
    }).unwrap()
}
```

**JavaScript Plugin:**
```typescript
// plugins/examples/external-validation-js/plugin.ts

import { definePlugin, Task, Annotation, StepContext, PostProcessResult } from '@annotation-platform/sdk';

interface Config {
  endpoint: string;
  timeout: number;
}

definePlugin({
  id: 'external-validation',
  name: 'External Validation Hook',
  version: '1.0.0',
  
  async postProcess(task: Task, annotation: Annotation, context: StepContext, config: Config): Promise<PostProcessResult> {
    Host.log.info(`Validating annotation ${annotation.id}`);
    
    try {
      const response = await Host.http.post(
        config.endpoint,
        JSON.stringify({ task: task.inputData, annotation: annotation.data }),
        { 'Content-Type': 'application/json' }
      );
      
      const result = JSON.parse(response);
      
      if (!result.valid) {
        return {
          actions: [{
            type: 'notification',
            parameters: { message: `Validation failed: ${result.errors.join(', ')}` }
          }]
        };
      }
      
      return {
        contextAdditions: {
          externalValidation: { valid: true, validatedAt: new Date().toISOString() }
        }
      };
    } catch (error) {
      Host.log.error(`Validation failed: ${error}`);
      return { actions: [{ type: 'alert', parameters: { message: 'Validation service error' } }] };
    }
  }
});
```

#### 13.4.7 Frontend Plugin Loader

```typescript
// frontend/src/plugins/PluginLoader.ts

import { ComponentPlugin, UIHookPlugin } from './types';

class PluginLoader {
  private componentRegistry = new Map<string, ComponentPlugin>();
  private wasmModules = new Map<string, WebAssembly.Module>();
  
  // Load JavaScript component plugin
  async loadJsPlugin(url: string): Promise<ComponentPlugin> {
    const module = await this.sandboxedImport(url);
    const plugin = module.default as ComponentPlugin;
    this.validatePlugin(plugin);
    this.componentRegistry.set(plugin.id, plugin);
    return plugin;
  }
  
  // Load WASM component plugin
  async loadWasmPlugin(wasmUrl: string, bindingsUrl: string): Promise<ComponentPlugin> {
    const [wasmBytes, bindings] = await Promise.all([
      fetch(wasmUrl).then(r => r.arrayBuffer()),
      this.sandboxedImport(bindingsUrl)
    ]);
    
    const module = await WebAssembly.compile(wasmBytes);
    const instance = await WebAssembly.instantiate(module, this.createImports());
    
    const plugin = bindings.createPlugin(instance);
    this.componentRegistry.set(plugin.id, plugin);
    this.wasmModules.set(plugin.id, module);
    
    return plugin;
  }
  
  getComponent(id: string): ComponentPlugin | undefined {
    return this.componentRegistry.get(id);
  }
  
  private createImports(): WebAssembly.Imports {
    return {
      env: {
        log_info: (ptr: number, len: number) => { /* ... */ },
        log_error: (ptr: number, len: number) => { /* ... */ },
      }
    };
  }
  
  private async sandboxedImport(url: string): Promise<any> {
    // Use iframe sandbox for security
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    try {
      return await new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.source === iframe.contentWindow) {
            window.removeEventListener('message', handler);
            event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.module);
          }
        };
        window.addEventListener('message', handler);
        iframe.contentWindow?.postMessage({ type: 'load', url }, '*');
      });
    } finally {
      document.body.removeChild(iframe);
    }
  }
}

export const pluginLoader = new PluginLoader();
```

```typescript
// frontend/src/plugins/PluginHost.tsx

import React, { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { pluginLoader } from './PluginLoader';
import { AnnotationComponentProps, PluginServices } from './types';

interface PluginHostProps {
  pluginId: string;
  componentProps: Omit<AnnotationComponentProps, 'services'>;
}

export const PluginHost: React.FC<PluginHostProps> = ({ pluginId, componentProps }) => {
  const plugin = pluginLoader.getComponent(pluginId);
  
  const services = useMemo<PluginServices>(() => ({
    ai: createAIService(),
    lookup: createLookupService(),
    storage: createStorageService(pluginId),
    events: createEventService(),
  }), [pluginId]);
  
  if (!plugin) return <PluginNotFound pluginId={pluginId} />;
  
  const Component = plugin.component;
  
  return (
    <ErrorBoundary FallbackComponent={({ error }) => <PluginError error={error} />}>
      <Suspense fallback={<PluginLoading />}>
        <div className="plugin-container" data-plugin-id={pluginId}>
          <Component {...componentProps} services={services} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};
```

#### 13.4.8 Plugin Security Model

| Aspect | Backend (WASM/JS) | Frontend (JS/WASM) |
|--------|------------------|-------------------|
| Memory Isolation | WASM linear memory / V8 isolate | iframe sandbox / WASM linear memory |
| Network Access | Allowlisted hosts only | CSP + proxy through backend |
| Storage Access | Plugin-scoped key-value store | Plugin-scoped localStorage |
| Secret Access | Configured per-plugin, read-only | No direct access (via backend API) |
| Execution Time | Configurable timeout (default 30s) | Configurable timeout (default 10s) |
| Memory Limit | Configurable (default 64MB) | Browser-enforced |
| API Access | Explicit host function imports | Injected service objects |

#### 13.4.9 Plugin Configuration

```yaml
# plugin-config.yaml

plugins:
  backend:
    - id: ai-prefill
      type: wasm
      source: ./plugins/ai-prefill.wasm
      config:
        allowed_hosts:
          - api.openai.com
          - api.anthropic.com
        secrets:
          - OPENAI_API_KEY
        max_execution_time_ms: 30000
        max_memory_bytes: 67108864
        
    - id: external-validation
      type: javascript
      source: ./plugins/external-validation.js
      config:
        allowed_hosts:
          - validation.internal.example.com
        max_execution_time_ms: 10000

  frontend:
    - id: custom-ner-tagger
      type: javascript
      source: https://cdn.example.com/plugins/ner-tagger.js
      integrity: sha384-...
      
    - id: medical-code-selector
      type: wasm
      source: https://cdn.example.com/plugins/medical-code.wasm
      bindings: https://cdn.example.com/plugins/medical-code-bindings.js
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Annotation | The labeled output produced by an annotator for a task |
| Adjudication | Process of resolving disagreements between annotators |
| Layout | UI configuration for displaying and capturing annotations |
| Project Type | A category of similar tasks with shared schema and requirements |
| Skill | A certifiable capability that qualifies users for certain tasks |
| Workflow | The sequence of steps a task goes through from creation to completion |
| Hook | An extension point for custom code execution |
| Gold Standard | A verified correct annotation used for quality measurement |

---

## Appendix B: Example Configurations

### B.1 Medical Coding Workflow

```yaml
workflow:
  name: "Medical Coding - Dual Annotation with Adjudication"
  type: multi_adjudication
  
  steps:
    - id: initial_coding
      name: "Initial Coding"
      type: annotation
      annotators_required: 2
      prevent_reassignment: true
      layout: medical_coding_layout
      required_skills:
        - skill: medical_coding
          min_proficiency: intermediate
      hooks:
        preProcess:
          - id: ai-code-suggestions
            handler: "@ensemble/ai-prefill"
            config:
              model: clinical-coder-v2
              fields: [diagnosis_codes, procedure_codes]
              
    - id: agreement_check
      name: "Agreement Check"
      type: auto_process
      handler: "@core/agreement-calculator"
      config:
        threshold: 0.9
        
    - id: adjudication
      name: "Adjudication"
      type: adjudication
      layout: adjudication_layout
      required_skills:
        - skill: medical_coding
          min_proficiency: expert
      required_roles:
        - adjudicator
        
  transitions:
    - from: initial_coding
      to: agreement_check
      condition: { type: on_complete }
      
    - from: agreement_check
      to: completed
      condition: 
        type: expression
        expression: "$.agreement_score >= 0.9"
        
    - from: agreement_check
      to: adjudication
      condition:
        type: expression
        expression: "$.agreement_score < 0.9"
        
    - from: adjudication
      to: completed
      condition: { type: on_complete }
```

### B.2 NER Annotation Layout

```yaml
layout:
  name: "Clinical NER Layout"
  components:
    - id: document_display
      type: core/text-display
      position: { row: 1, col: 1, width: 12 }
      data_binding: "$.input.document_text"
      props:
        format: plain
        
    - id: ner_tagger
      type: core/ner-tagger
      position: { row: 2, col: 1, width: 12 }
      data_binding: "$.input.document_text"
      output_key: "entities"
      props:
        entity_types:
          - { name: "Diagnosis", color: "#FF6B6B" }
          - { name: "Medication", color: "#4ECDC4" }
          - { name: "Procedure", color: "#45B7D1" }
          - { name: "Anatomy", color: "#96CEB4" }
        allow_overlapping: false
        
    - id: confidence
      type: core/select
      position: { row: 3, col: 1, width: 6 }
      output_key: "confidence"
      props:
        label: "Confidence Level"
        options:
          - { value: "high", label: "High" }
          - { value: "medium", label: "Medium" }
          - { value: "low", label: "Low" }
          
    - id: notes
      type: core/text-area
      position: { row: 3, col: 7, width: 6 }
      output_key: "notes"
      props:
        label: "Notes"
        placeholder: "Any additional observations..."
        rows: 3
```
