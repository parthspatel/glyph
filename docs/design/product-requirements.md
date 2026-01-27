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

#### 4.2.2 Multi-Annotation with Consensus
```
[Task] → [Annotate x N] → [Agreement Check] ─── agreed ───→ [Complete]
                                │
                                └── disagreed ──→ [Resolution] → [Complete]
```
- N annotators independently annotate same task
- System calculates agreement (configurable metric)
- If threshold met → auto-complete with consensus result
- If threshold not met → resolution strategy kicks in

**Resolution strategies (configurable):**

| Strategy | Behavior |
|----------|----------|
| `majority_vote` | Accept majority answer, complete automatically |
| `weighted_vote` | Weight by annotator quality scores, complete automatically |
| `adjudication` | Route to human adjudicator for final decision |
| `additional_annotators` | Add more annotators until threshold met or max reached |
| `escalate` | Flag for project admin review |

```xml
<ConsensusConfig>
  <Metric>agreement:krippendorff_alpha</Metric>
  <Threshold>0.85</Threshold>
  
  <!-- When annotators agree -->
  <OnAgreement action="complete">
    <ConsensusMethod>majority</ConsensusMethod>
  </OnAgreement>
  
  <!-- When they disagree -->
  <OnDisagreement>
    <Strategy>adjudication</Strategy>
    <!-- Or: majority_vote, weighted_vote, additional_annotators -->
    <FallbackStrategy>escalate</FallbackStrategy>
  </OnDisagreement>
</ConsensusConfig>
```

#### 4.2.3 Custom Workflow
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
├── input_mapping: InputMapping
├── output_mapping: OutputMapping
├── assignment_config: StepAssignmentConfig
├── completion_criteria: StepCompletionCriteria   # When THIS task can proceed
├── goal_contributions: GoalContribution[]        # How this step contributes to project goals
├── timeout: duration
├── retry_policy: RetryPolicy
└── hooks: StepHooks
```

#### 4.3.1 Step Completion Criteria

Step completion criteria define **when a single task can move to the next step**. This is simple and task-scoped:

```
StepCompletionCriteria
├── type: enum(annotation_count, review_decision, auto, manual)
├── annotation_count: int              # For annotation steps: how many annotators needed
├── unique_annotators: boolean         # Must be different users
├── min_required: int                  # Minimum to proceed if some fail/timeout
├── consensus_config: ConsensusConfig  # For multi-annotation: agreement handling
└── timeout_action: enum(proceed, retry, escalate)
```

**Examples:**

```xml
<!-- Single annotator -->
<CompletionCriteria type="annotation_count">
  <Count>1</Count>
</CompletionCriteria>

<!-- Dual annotation -->
<CompletionCriteria type="annotation_count">
  <Count>2</Count>
  <UniqueAnnotators>true</UniqueAnnotators>
  <MinRequired>2</MinRequired>
</CompletionCriteria>

<!-- Review step: single reviewer decides -->
<CompletionCriteria type="review_decision" />

<!-- Auto-process step: completes when processing done -->
<CompletionCriteria type="auto" />
```

#### 4.3.2 Goal Contributions

Steps **contribute** to project-level goals. Each step declares what metrics it reports:

```
GoalContribution
├── goal_id: string                    # Reference to project goal
├── contribution_type: enum(count, quality_metric, progress)
├── metric_source: string              # What to measure from this step
├── aggregation: enum(sum, latest, average, min, max)
└── weight: float                      # Relative weight for composite goals
```

```xml
<Step id="annotate" name="Initial Annotation">
  <!-- When is this task done at this step? -->
  <CompletionCriteria type="annotation_count">
    <Count>2</Count>
    <UniqueAnnotators>true</UniqueAnnotators>
  </CompletionCriteria>
  
  <!-- How does this step contribute to project goals? -->
  <GoalContributions>
    <!-- Contributes to volume goal -->
    <Contribution goal="volume">
      <Type>count</Type>
      <MetricSource>submitted_annotations</MetricSource>
      <Aggregation>sum</Aggregation>
    </Contribution>
    
    <!-- Contributes to agreement goal (measured after both annotators submit) -->
    <Contribution goal="quality">
      <Type>quality_metric</Type>
      <MetricSource>inter_annotator_agreement</MetricSource>
      <Aggregation>average</Aggregation>
    </Contribution>
  </GoalContributions>
</Step>
```

#### 4.3.3 Step Assignment Config

```
StepAssignmentConfig
├── assignment_mode: enum(auto, manual, pool)
├── required_skills: SkillRequirement[]
├── required_roles: Role[]
├── prevent_reassignment: boolean          # Don't assign same user from previous steps
├── team_restriction: UUID[]
├── load_balancing: enum(round_robin, least_loaded, quality_weighted)
├── max_concurrent_per_user: int           # Max tasks a user can have in progress
└── priority_rules: PriorityRule[]         # How to prioritize task assignment
```

---

### 4.4 Project Goals

Project goals define **the overall objectives of the project** and when the project is considered complete. Goals are tracked across all workflow steps.

```
ProjectGoal
├── goal_id: string
├── name: string
├── type: enum(volume, quality, deadline, duration, composite, manual)
├── config: GoalConfig
├── priority: int                      # For composite: evaluation order
├── required: boolean                  # Must be met vs. nice-to-have
└── notifications: GoalNotification[]
```

#### 4.4.1 Goal Types

**Volume Goal** — Total output across the project:

```xml
<Goal id="volume" name="Annotation Volume" type="volume" required="true">
  <Target>50000</Target>
  <Unit>annotations</Unit>
  <CountingRule>
    <!-- What counts toward the goal -->
    <Status>submitted,approved</Status>
    <Steps>annotate,review</Steps>           <!-- Which steps contribute -->
    <DedupeBy>task</DedupeBy>                <!-- Count unique tasks, not total annotations -->
  </CountingRule>
</Goal>
```

**Quality Goal** — Aggregate quality metric:

```xml
<Goal id="quality" name="Inter-Annotator Agreement" type="quality" required="true">
  <Metric>agreement:krippendorff_alpha</Metric>
  <Threshold>0.85</Threshold>
  <EvaluationWindow>
    <Type>rolling</Type>
    <Size>1000</Size>                        <!-- Last 1000 tasks -->
  </EvaluationWindow>
  <MinSampleSize>100</MinSampleSize>         <!-- Don't evaluate until 100 tasks -->
  <MeasuredAt>                               <!-- When/where to measure -->
    <Step>agreement_check</Step>
    <Trigger>on_step_complete</Trigger>
  </MeasuredAt>
</Goal>
```

**Deadline Goal** — Time-based completion:

```xml
<Goal id="deadline" name="Q1 Delivery" type="deadline" required="true">
  <Deadline>2025-03-31T23:59:59Z</Deadline>
  <Warnings>
    <Warning at="P30D">30 days remaining</Warning>
    <Warning at="P7D">7 days remaining - escalate if behind</Warning>
    <Warning at="P1D">Final day</Warning>
  </Warnings>
  <OnDeadline>
    <Action>complete_as_is</Action>          <!-- Or: extend, escalate, pause -->
    <NotifyRoles>project_admin,stakeholder</NotifyRoles>
  </OnDeadline>
</Goal>
```

**Duration Goal** — Relative time from start:

```xml
<Goal id="duration" name="30-Day Sprint" type="duration">
  <Duration>P30D</Duration>
  <StartFrom>first_task_created</StartFrom>  <!-- Or: project_start, first_annotation -->
</Goal>
```

**Composite Goal** — Combine multiple goals:

```xml
<Goal id="complete" name="Project Complete" type="composite" required="true">
  <Operator>and</Operator>
  <Goals>
    <GoalRef id="volume" />                  <!-- Must hit volume target -->
    <GoalRef id="quality" />                 <!-- AND quality target -->
  </Goals>
  
  <!-- Override: deadline supersedes other goals -->
  <Override>
    <Condition>
      <GoalRef id="deadline" status="reached" />
    </Condition>
    <Action>complete</Action>
    <Reason>Deadline reached - completing with current progress</Reason>
  </Override>
</Goal>
```

**Manual Goal** — Human decides when done:

```xml
<Goal id="manual_review" name="Stakeholder Signoff" type="manual">
  <AuthorizedRoles>project_admin,stakeholder</AuthorizedRoles>
  <RequireReason>true</RequireReason>
  <Checklist>
    <Item>Quality metrics reviewed</Item>
    <Item>Sample annotations verified</Item>
    <Item>Export validated</Item>
  </Checklist>
</Goal>
```

#### 4.4.2 Goal Progress Tracking

Each step reports its contribution to project goals:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Project Goals                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 Volume: 32,450 / 50,000 (65%)                                          │
│     ├── Annotate step: +32,450 annotations                                 │
│     ├── Review step: +3,245 reviewed                                       │
│     └── Rate: ~1,200/day → ETA: Feb 15                                     │
│                                                                             │
│  ✅ Quality: 87.3% agreement (target: 85%)                                  │
│     ├── Measured at: Agreement Check step                                  │
│     ├── Sample size: 28,420 tasks                                          │
│     └── Trend: Stable (±0.5% over 7 days)                                  │
│                                                                             │
│  📅 Deadline: 45 days remaining (March 31)                                  │
│     └── Status: On track (volume rate sufficient)                          │
│                                                                             │
│  🎯 Overall: IN PROGRESS                                                    │
│     └── Blocking: Volume goal (35% remaining)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.4.3 Goal Evaluation Engine

```rust
// crates/domain/goals/src/evaluator.rs

pub struct ProjectGoalEvaluator {
    goal_registry: Arc<GoalRegistry>,
    metrics_service: Arc<MetricsService>,
}

impl ProjectGoalEvaluator {
    /// Evaluate all project goals and return overall status
    pub async fn evaluate_project(&self, project_id: Uuid) -> Result<ProjectGoalStatus> {
        let goals = self.goal_registry.get_project_goals(project_id).await?;
        let mut statuses = Vec::new();
        
        for goal in &goals {
            let status = self.evaluate_goal(project_id, goal).await?;
            statuses.push(status);
        }
        
        // Determine overall project status
        let required_goals: Vec<_> = statuses.iter()
            .filter(|s| s.goal.required)
            .collect();
        
        let overall = if required_goals.iter().all(|s| s.is_complete()) {
            ProjectStatus::Complete
        } else if required_goals.iter().any(|s| s.is_failed()) {
            ProjectStatus::Failed
        } else {
            ProjectStatus::InProgress
        };
        
        Ok(ProjectGoalStatus {
            project_id,
            overall_status: overall,
            goal_statuses: statuses,
            evaluated_at: Utc::now(),
        })
    }
    
    /// Evaluate a single goal by aggregating step contributions
    async fn evaluate_goal(&self, project_id: Uuid, goal: &ProjectGoal) -> Result<GoalStatus> {
        match &goal.goal_type {
            GoalType::Volume(config) => {
                // Sum contributions from all steps
                let contributions = self.metrics_service
                    .get_goal_contributions(project_id, &goal.goal_id)
                    .await?;
                
                let total: i64 = contributions.iter()
                    .map(|c| c.value as i64)
                    .sum();
                
                let progress = total as f64 / config.target as f64;
                
                Ok(GoalStatus {
                    goal: goal.clone(),
                    current_value: total as f64,
                    target_value: config.target as f64,
                    progress,
                    status: if total >= config.target { Status::Complete } else { Status::InProgress },
                    contributions,
                })
            }
            
            GoalType::Quality(config) => {
                // Get latest quality measurement from designated step
                let measurement = self.metrics_service
                    .get_latest_quality_metric(project_id, &config.metric, &config.measured_at)
                    .await?;
                
                let meets_threshold = measurement
                    .map(|m| m.value >= config.threshold && m.sample_size >= config.min_sample_size)
                    .unwrap_or(false);
                
                Ok(GoalStatus {
                    goal: goal.clone(),
                    current_value: measurement.map(|m| m.value).unwrap_or(0.0),
                    target_value: config.threshold,
                    progress: measurement.map(|m| m.value / config.threshold).unwrap_or(0.0).min(1.0),
                    status: if meets_threshold { Status::Complete } else { Status::InProgress },
                    ..Default::default()
                })
            }
            
            GoalType::Deadline(config) => {
                let now = Utc::now();
                let remaining = config.deadline - now;
                
                Ok(GoalStatus {
                    goal: goal.clone(),
                    status: if now >= config.deadline { Status::Reached } else { Status::Pending },
                    time_remaining: Some(remaining),
                    ..Default::default()
                })
            }
            
            GoalType::Composite(config) => {
                // Recursively evaluate child goals
                let child_statuses: Vec<_> = futures::future::try_join_all(
                    config.goal_refs.iter().map(|id| self.evaluate_goal(project_id, &goals[id]))
                ).await?;
                
                let is_complete = match config.operator {
                    Operator::And => child_statuses.iter().all(|s| s.is_complete()),
                    Operator::Or => child_statuses.iter().any(|s| s.is_complete()),
                };
                
                // Check for overrides
                if let Some(override_config) = &config.override_rule {
                    if self.check_override_condition(project_id, override_config).await? {
                        return Ok(GoalStatus {
                            goal: goal.clone(),
                            status: Status::Complete,
                            override_applied: Some(override_config.reason.clone()),
                            ..Default::default()
                        });
                    }
                }
                
                Ok(GoalStatus {
                    goal: goal.clone(),
                    status: if is_complete { Status::Complete } else { Status::InProgress },
                    child_statuses: Some(child_statuses),
                    ..Default::default()
                })
            }
            
            _ => todo!()
        }
    }
}
```

### 4.5 Transitions

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

### 4.6 Preventing Duplicate Assignment

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

Layouts are defined using an **HTML/JSX-like markup language** that maps directly to React components. This provides:
- Familiar syntax for frontend developers
- Clear visual hierarchy
- Strong tooling support (syntax highlighting, validation, autocomplete)
- Direct mapping to rendered components

#### 5.2.1 Layout Definition Language (LDL)

```xml
<!-- Layout definition for Clinical NER annotation -->
<Layout id="clinical-ner-v1" name="Clinical NER Layout" version="1">
  
  <!-- Document display section -->
  <Section direction="column" gap="md">
    <Header level="3">Source Document</Header>
    
    <TextDisplay 
      bind:source="$.input.document_text"
      format="plain"
      :highlight="$.ui_context.ai_highlights"
    />
  </Section>

  <!-- Main annotation area -->
  <Section direction="column" gap="lg" flex="1">
    <Header level="3">Entity Annotation</Header>
    
    <NERTagger
      bind:source="$.input.document_text"
      bind:value="$.output.entities"
      :allow-overlapping="false"
    >
      <EntityType name="Diagnosis" color="#FF6B6B" hotkey="d" />
      <EntityType name="Medication" color="#4ECDC4" hotkey="m" />
      <EntityType name="Procedure" color="#45B7D1" hotkey="p" />
      <EntityType name="Anatomy" color="#96CEB4" hotkey="a" />
    </NERTagger>
    
    <!-- Show AI suggestions if available -->
    <Show when="$.ui_context.ai_predictions">
      <AISuggestions 
        bind:predictions="$.ui_context.ai_predictions"
        on:accept="applyPrediction"
      />
    </Show>
  </Section>

  <!-- Metadata section -->
  <Section direction="row" gap="md">
    <Select
      bind:value="$.output.confidence"
      label="Confidence Level"
      required="true"
      flex="1"
    >
      <Option value="high">High - Very confident</Option>
      <Option value="medium">Medium - Some uncertainty</Option>
      <Option value="low">Low - Significant uncertainty</Option>
    </Select>
    
    <TextArea
      bind:value="$.output.notes"
      label="Notes"
      placeholder="Any additional observations..."
      :rows="3"
      flex="2"
    />
  </Section>

</Layout>
```

#### 5.2.2 Layout DSL Syntax

**Data Binding:**
```xml
<!-- One-way binding from data source -->
<TextDisplay bind:source="$.input.document_text" />

<!-- Two-way binding for form inputs -->
<TextInput bind:value="$.output.patient_name" />

<!-- Reactive expressions (prefixed with :) -->
<Panel :visible="$.output.entities.length > 0" />
<Button :disabled="!$.validation.isValid" />
```

**Control Flow:**
```xml
<!-- Conditional rendering -->
<Show when="$.context.has_previous_annotations">
  <PreviousAnnotations bind:data="$.context.previous" />
</Show>

<Show when="$.input.document_type" equals="pdf">
  <PDFViewer bind:source="$.input.document_url" />
</Show>

<!-- Fallback content -->
<Show when="$.input.image_url" fallback={<Text>No image available</Text>}>
  <ImageViewer bind:source="$.input.image_url" />
</Show>

<!-- Iteration -->
<ForEach items="$.input.sentences" as="sentence" key="index">
  <SentenceAnnotator 
    bind:text="sentence.text"
    bind:value="$.output.annotations[index]"
  />
</ForEach>

<!-- Switch/case -->
<Switch on="$.input.task_type">
  <Case value="ner">
    <NERTagger ... />
  </Case>
  <Case value="classification">
    <Classification ... />
  </Case>
  <Default>
    <Text>Unsupported task type</Text>
  </Default>
</Switch>
```

**Layout & Styling:**
```xml
<!-- Flexbox layouts -->
<Section direction="row" gap="md" align="center" justify="between">
  <Box flex="1">...</Box>
  <Box flex="2">...</Box>
</Section>

<!-- Grid layouts -->
<Grid columns="3" gap="lg">
  <GridItem span="2">Wide content</GridItem>
  <GridItem>Narrow content</GridItem>
</Grid>

<!-- Responsive breakpoints -->
<Section 
  direction="column" 
  direction:md="row"
  gap="sm"
  gap:lg="md"
>
  ...
</Section>
```

**Events:**
```xml
<!-- Event handlers (implemented in layout hooks) -->
<Button on:click="submitAnnotation">Submit</Button>
<TextInput on:change="validateField" on:blur="saveProgress" />

<!-- Built-in events -->
<NERTagger 
  on:entity-add="onEntityAdded"
  on:entity-remove="onEntityRemoved"
  on:selection-change="onSelectionChange"
/>
```

#### 5.2.3 Component Schema

Each component has a strongly-typed schema:

```typescript
// Component definition with props schema
interface NERTaggerProps {
  // Data bindings
  'bind:source': JSONPath;      // Text to annotate
  'bind:value': JSONPath;       // Where to store entities
  
  // Configuration
  'allow-overlapping'?: boolean;
  'min-span-length'?: number;
  'max-span-length'?: number;
  'show-labels'?: boolean;
  
  // Children (entity type definitions)
  children: EntityTypeElement[];
}

interface EntityTypeElement {
  name: string;
  color: CSSColor;
  hotkey?: string;
  description?: string;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
}
```

#### 5.2.4 Adjudication Layout Example

```xml
<Layout id="adjudication-v1" name="Adjudication Layout">
  
  <!-- Side-by-side comparison of annotations -->
  <Section direction="row" gap="lg">
    
    <!-- Original task -->
    <Panel flex="1" title="Source Document">
      <TextDisplay bind:source="$.input.document_text" />
    </Panel>
    
    <!-- All annotations to compare -->
    <Panel flex="2" title="Annotations to Review">
      <AnnotationComparison
        bind:source="$.input.document_text"
        bind:annotations="$.context.previous_annotations"
        bind:resolution="$.output.resolved_entities"
        highlight-conflicts="true"
      >
        <!-- Conflict resolution UI -->
        <ConflictResolver 
          mode="select-or-edit"
          on:resolve="onConflictResolved"
        />
      </AnnotationComparison>
    </Panel>
    
  </Section>
  
  <!-- Agreement metrics -->
  <Section>
    <AgreementDisplay 
      bind:annotations="$.context.previous_annotations"
      metrics="['krippendorff_alpha', 'percentage']"
    />
  </Section>
  
  <!-- Resolution notes -->
  <Section>
    <TextArea
      bind:value="$.output.adjudication_notes"
      label="Resolution Notes"
      placeholder="Explain any significant decisions..."
      required-when="$.context.has_conflicts"
    />
  </Section>
  
</Layout>
```

#### 5.2.5 Layout Compilation

Layouts are compiled to React components at build time or runtime:

```rust
// crates/domain/layouts/src/compiler.rs

pub struct LayoutCompiler {
    component_registry: Arc<ComponentRegistry>,
    validator: LayoutValidator,
}

impl LayoutCompiler {
    /// Compile LDL markup to executable React component code
    pub fn compile(&self, ldl_source: &str) -> Result<CompiledLayout> {
        // 1. Parse LDL to AST
        let ast = self.parse(ldl_source)?;
        
        // 2. Validate against component schemas
        self.validator.validate(&ast)?;
        
        // 3. Generate React/TypeScript code
        let react_code = self.generate_react(&ast)?;
        
        // 4. Extract data binding metadata
        let bindings = self.extract_bindings(&ast)?;
        
        Ok(CompiledLayout {
            id: ast.id,
            react_code,
            bindings,
            required_components: ast.component_refs(),
        })
    }
}
```

```typescript
// Frontend: Runtime layout rendering
function LayoutRenderer({ layoutId, taskData, onSubmit }: LayoutRendererProps) {
  const { layout, isLoading } = useLayout(layoutId);
  const [formState, setFormState] = useState({});
  
  // Create binding context
  const bindingContext = useMemo(() => ({
    input: taskData.input,
    output: formState,
    context: taskData.context,
    ui_context: taskData.uiContext,
    validation: validate(formState, layout.schema),
  }), [taskData, formState, layout]);
  
  if (isLoading) return <LayoutSkeleton />;
  
  return (
    <BindingProvider value={bindingContext} onChange={setFormState}>
      <LayoutComponent layout={layout} />
      <SubmitBar onSubmit={() => onSubmit(formState)} />
    </BindingProvider>
  );
}
```

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

### 7.4 Quality Evaluation Configuration

Quality evaluation is fully configurable at the project level, with support for predefined evaluators and custom hooks.

#### 7.4.1 Quality Configuration Model

```
QualityConfig
├── config_id: UUID
├── project_id: UUID
├── evaluators: EvaluatorConfig[]
├── aggregation: AggregationConfig
├── scheduling: EvaluationSchedule
├── thresholds: ThresholdConfig
└── hooks: QualityHookConfig[]
```

#### 7.4.2 Evaluator Configuration

```
EvaluatorConfig
├── evaluator_id: string          # Unique identifier
├── type: enum(builtin, plugin)
├── builtin_type: string          # If type=builtin: "agreement", "accuracy", etc.
├── plugin_id: string             # If type=plugin: reference to custom plugin
├── name: string                  # Display name
├── enabled: boolean
├── weight: float                 # Weight in overall score (0.0-1.0)
├── scope: EvaluatorScope
├── parameters: object            # Evaluator-specific configuration
└── field_configs: FieldEvaluatorConfig[]  # Per-field overrides
```

```
EvaluatorScope
├── level: enum(task, field, span)
├── fields: string[]              # JSONPath to fields to evaluate (null = all)
├── exclude_fields: string[]      # Fields to exclude
└── annotation_types: string[]    # Which annotation types to evaluate
```

```
FieldEvaluatorConfig
├── field_path: string            # JSONPath to field
├── evaluator_override: string    # Use different evaluator for this field
├── weight: float                 # Field-specific weight
├── parameters: object            # Field-specific parameters
└── comparison_mode: enum(exact, fuzzy, semantic, custom)
```

#### 7.4.3 Built-in Evaluators

| Evaluator ID | Description | Key Parameters |
|--------------|-------------|----------------|
| `agreement:cohens_kappa` | Cohen's Kappa for 2 annotators | `weighted`: boolean |
| `agreement:fleiss_kappa` | Fleiss' Kappa for N annotators | `categories`: string[] |
| `agreement:krippendorff_alpha` | Krippendorff's Alpha (any # annotators) | `metric`: nominal/ordinal/interval/ratio |
| `agreement:percentage` | Simple percentage agreement | `partial_credit`: boolean |
| `agreement:iou` | Intersection over Union (spans/boxes) | `threshold`: float |
| `accuracy:gold_standard` | Comparison against gold labels | `gold_source`: string |
| `accuracy:expert_review` | Based on expert review outcomes | `reviewer_roles`: string[] |
| `consistency:self_agreement` | Agreement on duplicate tasks | `duplicate_rate`: float |
| `consistency:temporal` | Consistency over time windows | `window_days`: int |
| `speed:throughput` | Tasks completed per time unit | `time_unit`: string, `complexity_adjusted`: boolean |
| `speed:time_per_task` | Average time per task | `outlier_handling`: string |
| `completeness:required_fields` | All required fields populated | `required_fields`: string[] |
| `completeness:coverage` | Annotation coverage of source | `min_coverage`: float |

#### 7.4.4 Evaluator Parameter Schemas

```yaml
# Example: Krippendorff's Alpha configuration
evaluator:
  id: agreement:krippendorff_alpha
  parameters:
    metric: ordinal           # nominal, ordinal, interval, ratio
    bootstrap_samples: 1000   # For confidence intervals
    min_annotations: 2        # Minimum annotations required
    handle_missing: exclude   # exclude, impute, pairwise

# Example: IoU for bounding boxes
evaluator:
  id: agreement:iou
  parameters:
    threshold: 0.5            # IoU threshold for "agreement"
    per_class: true           # Calculate per class or overall
    ignore_classes: ["background"]
    
# Example: Gold standard accuracy
evaluator:
  id: accuracy:gold_standard
  parameters:
    gold_source: adjudicated  # adjudicated, expert, external
    external_dataset: null    # If gold_source=external
    partial_credit:
      enabled: true
      span_overlap_threshold: 0.8
      hierarchy_credit: true  # Credit for parent categories
```

#### 7.4.5 Custom Quality Evaluator Hooks

Custom evaluators can be implemented as plugins (WASM or JS):

```typescript
// Quality Evaluator Plugin Interface
interface QualityEvaluatorPlugin {
  id: string;
  name: string;
  version: string;
  
  // Schema for configuration parameters
  parameterSchema: JSONSchema;
  
  // Schema for input (what annotations look like)
  inputSchema: JSONSchema;
  
  // Evaluate a single task
  evaluateTask(input: TaskEvaluationInput, config: object): Promise<TaskEvaluationResult>;
  
  // Aggregate results across tasks (optional - default is mean)
  aggregate?(results: TaskEvaluationResult[], config: object): Promise<AggregateResult>;
  
  // Evaluate at user level (optional)
  evaluateUser?(input: UserEvaluationInput, config: object): Promise<UserEvaluationResult>;
}

interface TaskEvaluationInput {
  task: Task;
  annotations: Annotation[];           // All annotations for this task
  goldAnnotation?: Annotation;         // Gold standard if available
  previousEvaluations?: EvaluationResult[];  // Previous eval results
  context: {
    projectType: ProjectType;
    workflow: Workflow;
    step: WorkflowStep;
  };
}

interface TaskEvaluationResult {
  score: number;                       // 0.0 - 1.0
  confidence: number;                  // Statistical confidence
  details: {
    fieldScores?: Record<string, number>;  // Per-field breakdown
    pairwiseScores?: PairwiseScore[];      // Annotator pair scores
    issues?: QualityIssue[];               // Specific problems found
  };
  metadata: object;                    // Evaluator-specific data
}

interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  field?: string;
  annotatorIds?: string[];
  message: string;
  code: string;
  suggestion?: string;
}
```

**Example Custom Evaluator (Medical Coding Accuracy):**

```typescript
// plugins/quality/medical-coding-accuracy.ts
import { defineQualityEvaluator } from '@annotation-platform/sdk';

defineQualityEvaluator({
  id: 'medical:coding_accuracy',
  name: 'Medical Coding Accuracy',
  version: '1.0.0',
  
  parameterSchema: {
    type: 'object',
    properties: {
      code_system: { type: 'string', enum: ['ICD-10', 'CPT', 'HCPCS'] },
      hierarchy_credit: { type: 'boolean', default: true },
      specificity_weight: { type: 'number', default: 0.3 },
      primary_code_weight: { type: 'number', default: 0.5 },
    }
  },
  
  async evaluateTask(input, config) {
    const { annotations, goldAnnotation } = input;
    
    if (!goldAnnotation) {
      // Fall back to consensus-based evaluation
      return this.evaluateByConsensus(annotations, config);
    }
    
    const results = annotations.map(ann => {
      const annotatedCodes = ann.data.diagnosis_codes as string[];
      const goldCodes = goldAnnotation.data.diagnosis_codes as string[];
      
      let score = 0;
      const fieldScores: Record<string, number> = {};
      
      // Exact match score
      const exactMatches = annotatedCodes.filter(c => goldCodes.includes(c));
      const exactScore = exactMatches.length / Math.max(goldCodes.length, 1);
      
      // Hierarchy credit (e.g., E11.9 vs E11.65)
      let hierarchyScore = 0;
      if (config.hierarchy_credit) {
        hierarchyScore = this.calculateHierarchyCredit(annotatedCodes, goldCodes, config);
      }
      
      // Specificity bonus/penalty
      const specificityScore = this.evaluateSpecificity(annotatedCodes, goldCodes, config);
      
      // Weighted combination
      score = (exactScore * 0.6) + (hierarchyScore * 0.25) + (specificityScore * 0.15);
      
      fieldScores['diagnosis_codes'] = score;
      
      return { annotationId: ann.id, score, fieldScores };
    });
    
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    return {
      score: avgScore,
      confidence: this.calculateConfidence(results),
      details: {
        fieldScores: this.aggregateFieldScores(results),
        issues: this.identifyIssues(annotations, goldAnnotation, config),
      },
      metadata: {
        evaluation_method: goldAnnotation ? 'gold_standard' : 'consensus',
        code_system: config.code_system,
      }
    };
  },
  
  calculateHierarchyCredit(annotated: string[], gold: string[], config: any): number {
    // ICD-10 codes have hierarchical structure: E11 > E11.6 > E11.65
    let credit = 0;
    for (const gc of gold) {
      const prefix3 = gc.substring(0, 3);
      const prefix4 = gc.substring(0, 5);
      
      if (annotated.some(ac => ac.startsWith(prefix3))) {
        credit += 0.5;  // Category match
      }
      if (annotated.some(ac => ac.startsWith(prefix4))) {
        credit += 0.3;  // Subcategory match
      }
    }
    return Math.min(1, credit / gold.length);
  }
});
```

#### 7.4.6 Quality Aggregation Configuration

```
AggregationConfig
├── method: enum(weighted_mean, harmonic_mean, min, geometric_mean, custom)
├── weights: Map<string, float>    # evaluator_id -> weight
├── custom_aggregator: string      # Plugin ID if method=custom
├── exclude_below_confidence: float  # Exclude low-confidence scores
└── outlier_handling: enum(include, winsorize, exclude)
```

#### 7.4.7 Evaluation Scheduling

```
EvaluationSchedule
├── trigger: enum(on_submit, on_complete, periodic, manual)
├── periodic_interval: duration    # If trigger=periodic
├── batch_size: int                # Tasks per evaluation batch
├── delay_after_submit: duration   # Wait before evaluating
├── reevaluate_on: string[]        # Events that trigger re-evaluation
└── priority: enum(real_time, background, low)
```

#### 7.4.8 Quality-Based Actions (Extended)

```
ThresholdConfig
├── rules: QualityRule[]
├── alert_channels: AlertChannel[]
└── escalation_policy: EscalationPolicy
```

```
QualityRule
├── rule_id: UUID
├── name: string
├── description: string
├── condition: QualityCondition
├── actions: QualityAction[]
├── cooldown: duration             # Prevent action spam
├── enabled: boolean
└── priority: int
```

```
QualityCondition
├── type: enum(threshold, trend, comparison, composite)
├── metric: string                 # Evaluator ID or "overall"
├── operator: enum(lt, lte, gt, gte, eq, between, change_by)
├── value: float | float[]
├── window: duration               # For trend-based conditions
├── min_sample_size: int
├── scope: enum(task, user, team, project)
└── filters: ConditionFilter[]     # Additional filters
```

```yaml
# Example Quality Rules Configuration
quality_rules:
  - name: "Low Agreement Alert"
    condition:
      type: threshold
      metric: agreement:krippendorff_alpha
      operator: lt
      value: 0.7
      scope: project
      window: 24h
      min_sample_size: 50
    actions:
      - type: alert
        parameters:
          channel: slack
          message: "Project agreement dropped below 0.7"
          
  - name: "User Quality Decline"
    condition:
      type: trend
      metric: overall
      operator: change_by
      value: -0.15  # 15% decline
      window: 7d
      scope: user
    actions:
      - type: restrict_assignment
        parameters:
          restriction: reduce_volume
          factor: 0.5
      - type: notify
        parameters:
          target: team_lead
          
  - name: "Auto-approve High Quality"
    condition:
      type: composite
      operator: and
      conditions:
        - metric: accuracy:gold_standard
          operator: gte
          value: 0.95
        - metric: completeness:required_fields
          operator: eq
          value: 1.0
    actions:
      - type: workflow_action
        parameters:
          action: auto_approve
          skip_review: true
```

### 7.5 Quality Calculation Methods

| Metric | Calculation | Use Case |
|--------|-------------|----------|
| Agreement Rate | % of annotations matching consensus | Multi-annotator tasks |
| Accuracy | Comparison against gold standard | When gold labels exist |
| Consistency | Self-agreement on duplicate tasks | Internal consistency check |
| Speed | Tasks per hour, adjusted for complexity | Throughput measurement |
| Rejection Rate | % of annotations rejected in review | Review workflows |
| Adjudication Rate | % of tasks requiring adjudication | Conflict frequency |

### 7.6 Quality-Based Actions

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

## 7A. Annotation Storage Architecture

### 7A.1 Storage Design Principles

1. **Write-optimized for annotation capture**: High throughput for concurrent annotators
2. **Read-optimized for exports**: Efficient batch retrieval for ML pipelines
3. **Flexible schema**: Support varying annotation structures across project types
4. **Full audit trail**: Immutable history for compliance
5. **Scalable**: Handle billions of annotations across thousands of projects

### 7A.2 Data Model

#### 7A.2.1 Core Annotation Storage

```sql
-- Partitioned by project for query isolation and maintenance
CREATE TABLE annotations (
    annotation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES tasks(task_id),
    step_id             UUID NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(user_id),
    project_id          UUID NOT NULL,  -- Denormalized for partitioning
    
    -- Annotation data stored as JSONB for flexibility
    data                JSONB NOT NULL,
    
    -- Status tracking
    status              annotation_status NOT NULL DEFAULT 'draft',
    
    -- Versioning
    version             INT NOT NULL DEFAULT 1,
    parent_version_id   UUID REFERENCES annotations(annotation_id),
    
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ,
    
    -- Quality scores (denormalized for query performance)
    quality_score       FLOAT,
    quality_evaluated_at TIMESTAMPTZ,
    
    -- Metadata
    time_spent_ms       BIGINT,
    client_metadata     JSONB,  -- Browser, session info, etc.
    
    CONSTRAINT valid_quality CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1))
) PARTITION BY HASH (project_id);

-- Create partitions (example: 16 partitions)
CREATE TABLE annotations_p0 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE annotations_p1 PARTITION OF annotations FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... etc

-- Indexes optimized for common access patterns
CREATE INDEX idx_annotations_task ON annotations(task_id, step_id);
CREATE INDEX idx_annotations_user ON annotations(user_id, created_at DESC);
CREATE INDEX idx_annotations_project_status ON annotations(project_id, status, created_at DESC);
CREATE INDEX idx_annotations_submitted ON annotations(project_id, submitted_at DESC) WHERE status = 'submitted';

-- GIN index for JSONB queries (annotation content search)
CREATE INDEX idx_annotations_data ON annotations USING GIN (data jsonb_path_ops);
```

#### 7A.2.2 Annotation History (Event Sourcing)

```sql
-- Immutable audit log of all annotation changes
CREATE TABLE annotation_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id       UUID NOT NULL,
    event_type          VARCHAR(50) NOT NULL,  -- created, updated, submitted, approved, rejected
    
    -- Full snapshot at this point in time
    data_snapshot       JSONB NOT NULL,
    
    -- Change details
    changes             JSONB,  -- JSON Patch of what changed
    
    -- Actor information
    actor_id            UUID NOT NULL,
    actor_type          VARCHAR(20) NOT NULL,  -- user, system, api
    
    -- Timestamp (immutable)
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Context
    request_id          UUID,  -- Correlation ID
    ip_address          INET,
    user_agent          TEXT
) PARTITION BY RANGE (occurred_at);

-- Monthly partitions for time-based retention
CREATE TABLE annotation_events_2025_01 PARTITION OF annotation_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... create partitions automatically via pg_partman or similar

CREATE INDEX idx_annotation_events_annotation ON annotation_events(annotation_id, occurred_at);
CREATE INDEX idx_annotation_events_actor ON annotation_events(actor_id, occurred_at DESC);
```

#### 7A.2.3 Materialized Views for Analytics

```sql
-- Daily aggregates for dashboard performance
CREATE MATERIALIZED VIEW mv_daily_annotation_stats AS
SELECT 
    date_trunc('day', submitted_at) AS day,
    project_id,
    user_id,
    COUNT(*) AS annotation_count,
    AVG(quality_score) AS avg_quality,
    AVG(time_spent_ms) AS avg_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_spent_ms) AS median_time_ms
FROM annotations
WHERE status = 'submitted'
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX ON mv_daily_annotation_stats(day, project_id, user_id);

-- Refresh periodically
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_annotation_stats;

-- User quality summary
CREATE MATERIALIZED VIEW mv_user_quality_summary AS
SELECT 
    user_id,
    project_id,
    COUNT(*) AS total_annotations,
    AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL) AS avg_quality,
    STDDEV(quality_score) FILTER (WHERE quality_score IS NOT NULL) AS quality_stddev,
    COUNT(*) FILTER (WHERE quality_score >= 0.9) AS high_quality_count,
    COUNT(*) FILTER (WHERE quality_score < 0.7) AS low_quality_count,
    MAX(submitted_at) AS last_annotation_at
FROM annotations
WHERE status IN ('submitted', 'approved')
GROUP BY user_id, project_id;
```

### 7A.3 Storage Architecture

#### 7A.3.1 Design Principles

1. **Postgres is the source of truth** — All annotation data writes go directly to PostgreSQL
2. **Simple write path** — No intermediate queues or caches for writes
3. **External background services** — Quality calculation, exports, and sync run as separate services
4. **Redis for coordination only** — Sessions, locks, pub/sub, read caching

#### 7A.3.2 System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           API Layer                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐          │
│  │  Annotation  │────▶│  API Server  │────▶│  PostgreSQL  │          │
│  │     UI       │     │   (Axum)     │     │  (Primary)   │          │
│  └──────────────┘     └──────┬───────┘     └──────┬───────┘          │
│                              │                     │                  │
│                              ▼                     │                  │
│                       ┌──────────────┐             │                  │
│                       │    Redis     │             │                  │
│                       │ (coordination)│            │                  │
│                       └──────────────┘             │                  │
│                                                    │                  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                     Background Services                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐          │
│  │   Quality    │     │   Export     │     │  Warehouse   │          │
│  │   Service    │     │   Service    │     │    Sync      │          │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘          │
│         │                    │                    │                  │
│         └────────────────────┼────────────────────┘                  │
│                              ▼                                        │
│                       ┌──────────────┐     ┌──────────────┐          │
│                       │  PostgreSQL  │     │      S3      │          │
│                       │  (Replica)   │     │   (Exports)  │          │
│                       └──────────────┘     └──────────────┘          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

#### 7A.3.3 Write Path

Direct writes to PostgreSQL — simple and reliable:

```rust
// crates/domain/annotations/src/repository.rs

impl AnnotationRepository {
    pub async fn submit_annotation(
        &self,
        annotation: NewAnnotation,
    ) -> Result<Annotation> {
        // Direct write to Postgres
        let result = sqlx::query_as!(
            Annotation,
            r#"
            INSERT INTO annotations 
                (task_id, step_id, user_id, project_id, data, status, submitted_at, time_spent_ms)
            VALUES ($1, $2, $3, $4, $5, 'submitted', NOW(), $6)
            RETURNING *
            "#,
            annotation.task_id,
            annotation.step_id,
            annotation.user_id,
            annotation.project_id,
            annotation.data,
            annotation.time_spent_ms,
        )
        .fetch_one(&self.pool)
        .await?;
        
        // Invalidate cached reads
        self.cache.delete(&format!("task:{}:annotations", annotation.task_id)).await.ok();
        
        // Publish event for real-time updates and background processing
        self.events.publish(AnnotationEvent::Submitted { 
            annotation_id: result.annotation_id,
            task_id: result.task_id,
            project_id: result.project_id,
        }).await?;
        
        Ok(result)
    }
}
```

**Why this is sufficient:**
- Annotators submit ~20-60 tasks/hour per person
- Even 1,000 concurrent annotators = ~17 writes/second
- PostgreSQL easily handles 10,000+ writes/second with proper tuning
- No risk of data loss from intermediate buffer failures

#### 7A.3.4 Redis Usage (Coordination Only)

Redis is used for coordination and caching, **not** for the write path:

| Use Case | Purpose |
|----------|---------|
| Session tokens | Fast auth lookup with natural TTL |
| Task assignment locks | Distributed locks to prevent double-assignment |
| Real-time presence | "User X is working on task Y" |
| Event pub/sub | Broadcasting to WebSocket connections |
| Read caching | Project configs, layouts, user permissions |
| Rate limiting | API request throttling |

```rust
// Example: Task assignment with distributed lock
impl TaskAssigner {
    pub async fn assign_next_task(&self, user_id: Uuid, project_id: Uuid) -> Result<Option<Task>> {
        // Acquire lock to prevent race conditions in assignment
        let lock_key = format!("lock:assign:{}:{}", project_id, user_id);
        let lock = self.redis.acquire_lock(&lock_key, Duration::from_secs(10)).await?;
        
        let _guard = scopeguard::guard(lock, |l| {
            // Release lock when done
            tokio::spawn(async move { l.release().await });
        });
        
        // Find and assign task (reads/writes go to Postgres)
        let task = self.find_eligible_task(user_id, project_id).await?;
        
        if let Some(task) = &task {
            self.create_assignment(task.task_id, user_id).await?;
        }
        
        Ok(task)
    }
}
```

#### 7A.3.5 Background Services

Background processing runs as **external services** that connect to the database, not as database-embedded logic:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Background Services                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐   Each service is a standalone binary:     │
│  │ Quality Service │   - Connects to Postgres read replica      │
│  │                 │   - Subscribes to events via NATS/Redis    │
│  │ - Event-driven  │   - Horizontally scalable                  │
│  │ - Scheduled     │   - Independent deployment                 │
│  └─────────────────┘                                            │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ Export Service  │                                            │
│  │                 │                                            │
│  │ - On-demand     │                                            │
│  │ - Scheduled     │                                            │
│  └─────────────────┘                                            │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ Notification    │                                            │
│  │ Service         │                                            │
│  │                 │                                            │
│  │ - Webhooks      │                                            │
│  │ - Email         │                                            │
│  │ - Slack         │                                            │
│  └─────────────────┘                                            │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ Warehouse Sync  │                                            │
│  │ Service         │                                            │
│  │                 │                                            │
│  │ - CDC-based     │                                            │
│  │ - Incremental   │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Quality Service Example:**

```rust
// services/quality-service/src/main.rs

#[tokio::main]
async fn main() -> Result<()> {
    let config = Config::from_env()?;
    
    // Connect to Postgres (preferably read replica for heavy queries)
    let db_pool = PgPoolOptions::new()
        .max_connections(config.db_max_connections)
        .connect(&config.database_url)
        .await?;
    
    // Subscribe to annotation events
    let nats = async_nats::connect(&config.nats_url).await?;
    let mut subscription = nats.subscribe("annotations.submitted").await?;
    
    // Also run scheduled evaluations
    let scheduler = JobScheduler::new().await?;
    scheduler.add(Job::new_async("0 */15 * * * *", |_, _| {
        Box::pin(async move {
            run_scheduled_evaluations().await;
        })
    })?).await?;
    scheduler.start().await?;
    
    // Process events
    while let Some(msg) = subscription.next().await {
        let event: AnnotationEvent = serde_json::from_slice(&msg.payload)?;
        
        match event {
            AnnotationEvent::Submitted { annotation_id, task_id, project_id } => {
                // Check if this task now has enough annotations to evaluate
                let config = get_quality_config(&db_pool, project_id).await?;
                let annotations = get_task_annotations(&db_pool, task_id).await?;
                
                if should_evaluate(&config, &annotations) {
                    let result = evaluate_task(&db_pool, task_id, &config).await?;
                    save_quality_score(&db_pool, &result).await?;
                    
                    // Publish quality evaluated event
                    nats.publish("quality.evaluated", serde_json::to_vec(&result)?).await?;
                }
            }
        }
    }
    
    Ok(())
}
```

**Export Service Example:**

```rust
// services/export-service/src/main.rs

#[tokio::main]
async fn main() -> Result<()> {
    let config = Config::from_env()?;
    let db_pool = connect_db(&config).await?;
    let s3 = create_s3_client(&config).await?;
    let nats = async_nats::connect(&config.nats_url).await?;
    
    let mut subscription = nats.subscribe("exports.requested").await?;
    
    while let Some(msg) = subscription.next().await {
        let request: ExportRequest = serde_json::from_slice(&msg.payload)?;
        
        // Update status to processing
        update_export_status(&db_pool, request.export_id, ExportStatus::Processing).await?;
        
        // Stream annotations and write to Parquet
        let result = export_to_parquet(&db_pool, &s3, &request).await;
        
        match result {
            Ok(export_result) => {
                update_export_status(&db_pool, request.export_id, ExportStatus::Completed).await?;
                nats.publish("exports.completed", serde_json::to_vec(&export_result)?).await?;
            }
            Err(e) => {
                update_export_status(&db_pool, request.export_id, ExportStatus::Failed).await?;
                tracing::error!(export_id = %request.export_id, error = %e, "Export failed");
            }
        }
    }
    
    Ok(())
}
```

#### 7A.3.6 Event Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────┐
│   API    │────▶│ Postgres │     │   NATS   │────▶│ Background       │
│  Server  │     │          │     │          │     │ Services         │
└────┬─────┘     └──────────┘     └────▲─────┘     └──────────────────┘
     │                                 │
     └─────────────────────────────────┘
           Publish event after
           successful DB write
```

Events are published **after** successful database commits:

```rust
pub async fn submit_annotation(&self, annotation: NewAnnotation) -> Result<Annotation> {
    // 1. Write to database
    let result = self.insert_annotation(&annotation).await?;
    
    // 2. Only publish event after successful commit
    // If this fails, the annotation is still saved (eventual consistency for downstream)
    if let Err(e) = self.events.publish("annotations.submitted", &result).await {
        tracing::warn!(error = %e, "Failed to publish event, background processing may be delayed");
        // Don't fail the request - data is safe in Postgres
    }
    
    Ok(result)
}
```

```rust
// crates/infrastructure/src/export.rs

pub struct AnnotationExporter {
    pool: PgPool,
    storage: Arc<dyn ObjectStorage>,
}

impl AnnotationExporter {
    /// Stream annotations for export (memory-efficient)
    pub fn stream_project_annotations(
        &self,
        project_id: Uuid,
        filters: ExportFilters,
    ) -> impl Stream<Item = Result<AnnotationExportRow>> + '_ {
        
        let query = r#"
            SELECT 
                a.annotation_id,
                a.task_id,
                t.input_data as task_input,
                a.data as annotation_data,
                a.user_id,
                a.quality_score,
                a.submitted_at
            FROM annotations a
            JOIN tasks t ON a.task_id = t.task_id
            WHERE a.project_id = $1
              AND a.status = ANY($2)
              AND ($3::timestamptz IS NULL OR a.submitted_at >= $3)
              AND ($4::timestamptz IS NULL OR a.submitted_at <= $4)
            ORDER BY a.submitted_at
        "#;
        
        sqlx::query_as::<_, AnnotationExportRow>(query)
            .bind(project_id)
            .bind(&filters.statuses)
            .bind(filters.from_date)
            .bind(filters.to_date)
            .fetch(&self.pool)  // Returns async stream
    }
    
    /// Export to Parquet for ML pipelines
    pub async fn export_to_parquet(
        &self,
        project_id: Uuid,
        filters: ExportFilters,
        output_path: &str,
    ) -> Result<ExportResult> {
        use arrow::array::*;
        use parquet::arrow::ArrowWriter;
        
        let mut annotation_ids = Vec::new();
        let mut task_inputs = Vec::new();
        let mut annotation_data = Vec::new();
        let mut quality_scores = Vec::new();
        
        let mut stream = self.stream_project_annotations(project_id, filters);
        let mut row_count = 0;
        
        while let Some(row) = stream.next().await {
            let row = row?;
            annotation_ids.push(row.annotation_id.to_string());
            task_inputs.push(row.task_input.to_string());
            annotation_data.push(row.annotation_data.to_string());
            quality_scores.push(row.quality_score);
            row_count += 1;
            
            // Write in batches of 100k rows
            if row_count % 100_000 == 0 {
                // Flush batch to Parquet
            }
        }
        
        // Write final batch and upload to S3
        let s3_path = format!("exports/{}/{}.parquet", project_id, Utc::now().timestamp());
        self.storage.upload(&s3_path, parquet_bytes).await?;
        
        Ok(ExportResult {
            row_count,
            file_path: s3_path,
            file_size_bytes: parquet_bytes.len(),
        })
    }
}
```

### 7A.4 Data Access Patterns

#### 7A.4.1 REST API Endpoints

```
GET  /api/v1/annotations
     ?project_id=...
     &task_id=...
     &user_id=...
     &status=submitted,approved
     &from_date=2025-01-01
     &to_date=2025-01-31
     &include_task_data=true
     &page_size=100
     &cursor=...

GET  /api/v1/annotations/{id}
GET  /api/v1/annotations/{id}/history
GET  /api/v1/tasks/{task_id}/annotations

# Bulk operations
POST /api/v1/annotations/bulk
     { "annotations": [...] }

# Export endpoints
POST /api/v1/projects/{id}/export
     {
       "format": "parquet",
       "filters": { ... },
       "destination": "s3://bucket/path"
     }

GET  /api/v1/projects/{id}/export/{export_id}/status
GET  /api/v1/projects/{id}/export/{export_id}/download
```

#### 7A.4.2 Streaming Export API

```rust
// Server-Sent Events for large exports
async fn stream_annotations(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Query(filters): Query<ExportFilters>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = state.annotation_repo
        .stream_project_annotations(project_id, filters)
        .map(|result| {
            match result {
                Ok(row) => Ok(Event::default()
                    .event("annotation")
                    .json_data(row)
                    .unwrap()),
                Err(e) => Ok(Event::default()
                    .event("error")
                    .data(e.to_string())),
            }
        });
    
    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive")
    )
}
```

#### 7A.4.3 Export Formats

| Format | Use Case | Features |
|--------|----------|----------|
| JSON Lines (.jsonl) | Streaming ingestion | One JSON object per line, easy to parse |
| Parquet | ML training, analytics | Columnar, compressed, schema-preserving |
| CSV | Simple exports, spreadsheets | Universal compatibility |
| COCO | Computer vision tasks | Standard format for object detection |
| CoNLL | NER/sequence labeling | Standard format for NLP tasks |
| Custom | Domain-specific | Via export hooks/plugins |

#### 7A.4.4 Export Configuration

```yaml
export_config:
  format: parquet
  
  # What to include
  include:
    task_input: true
    annotation_data: true
    quality_scores: true
    user_ids: false          # Privacy: anonymize
    timestamps: true
    
  # Data transformations
  transformations:
    - type: flatten_json
      fields: ["annotation_data.entities"]
    - type: anonymize
      fields: ["user_id"]
      method: hash
    - type: filter_fields
      include: ["text", "labels", "spans"]
      
  # Partitioning for large exports
  partitioning:
    enabled: true
    strategy: by_date
    partition_size: 100000   # rows per file
    
  # Destination
  destination:
    type: s3
    bucket: ml-training-data
    prefix: "projects/{project_id}/exports/{export_id}/"
    
  # Notifications
  on_complete:
    - type: webhook
      url: https://ml-pipeline.example.com/trigger
    - type: email
      recipients: ["data-team@example.com"]
```

### 7A.5 Data Access for Analytics

#### 7A.5.1 Read Replicas

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Primary    │────▶│   Replica 1  │     │   Replica 2  │
│  (Writes)    │     │  (API Reads) │     │  (Analytics) │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                     ┌──────▼───────┐     ┌───────▼──────┐
                     │  API Servers │     │   BI Tools   │
                     └──────────────┘     │  (Metabase,  │
                                          │   Tableau)   │
                                          └──────────────┘
```

#### 7A.5.2 Direct Database Access (Analytics)

For analytics teams needing direct SQL access:

```sql
-- Create read-only role with row-level security
CREATE ROLE analytics_reader;
GRANT CONNECT ON DATABASE annotation_platform TO analytics_reader;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;

-- Row-level security for project isolation
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_project_access ON annotations
    FOR SELECT
    TO analytics_reader
    USING (project_id IN (
        SELECT project_id FROM user_project_access 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    ));
```

#### 7A.5.3 Data Warehouse Integration

```rust
// Sync to data warehouse (e.g., Snowflake, BigQuery)
pub struct WarehouseSync {
    source_pool: PgPool,
    warehouse: Arc<dyn DataWarehouse>,
}

impl WarehouseSync {
    pub async fn sync_incremental(&self, last_sync: DateTime<Utc>) -> Result<SyncResult> {
        // Extract changed annotations since last sync
        let changes = sqlx::query_as!(
            AnnotationChange,
            r#"
            SELECT * FROM annotation_events
            WHERE occurred_at > $1
            ORDER BY occurred_at
            "#,
            last_sync
        )
        .fetch_all(&self.source_pool)
        .await?;
        
        // Transform to warehouse schema
        let warehouse_rows: Vec<WarehouseRow> = changes
            .into_iter()
            .map(|c| c.into())
            .collect();
        
        // Load to warehouse
        self.warehouse.upsert("annotations", &warehouse_rows).await?;
        
        Ok(SyncResult {
            rows_synced: warehouse_rows.len(),
            sync_timestamp: Utc::now(),
        })
    }
}
```

### 7A.6 Data Lifecycle Management

```yaml
data_lifecycle:
  # Hot tier: Recent, actively accessed data
  hot:
    storage: postgresql_primary
    retention: 90d
    
  # Warm tier: Older data, less frequent access
  warm:
    storage: postgresql_archive
    retention: 2y
    compression: enabled
    
  # Cold tier: Long-term archive
  cold:
    storage: s3_glacier
    retention: 7y
    format: parquet
    
  # Policies
  policies:
    - name: archive_completed_projects
      condition: "project.status = 'archived' AND project.completed_at < NOW() - INTERVAL '90 days'"
      action: move_to_warm
      
    - name: delete_draft_annotations
      condition: "status = 'draft' AND updated_at < NOW() - INTERVAL '30 days'"
      action: delete
      
    - name: anonymize_old_data
      condition: "submitted_at < NOW() - INTERVAL '2 years'"
      action: anonymize_pii
```

---

## 8. Dashboard & Reporting

### 8.0 Workflow Interaction UI

#### 8.0.1 Project Workflow View

When a user opens a project, they see an interactive DAG visualization of the workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Project: Clinical NER Annotation                                           │
│  Overall Progress: 67% (3,350 / 5,000 tasks)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────┐                                    │
│                         │   Annotate   │                                    │
│                         │    (NER)     │                                    │
│                         │  ▓▓▓▓▓▓░░ 72%│                                    │
│                         └──────┬───────┘                                    │
│                                │                                            │
│                                ▼                                            │
│                         ┌──────────────┐                                    │
│                         │  Agreement   │                                    │
│                         │    Check     │                                    │
│                         │  ▓▓▓▓▓░░░ 65%│                                    │
│                         └──────┬───────┘                                    │
│                               ╱ ╲                                           │
│                    ≥90%      ╱   ╲     <90%                                 │
│                             ╱     ╲                                         │
│                            ▼       ▼                                        │
│             ┌──────────────┐       ┌──────────────┐                         │
│             │  ✓ Complete  │       │ Adjudication │                         │
│             │              │       │              │                         │
│             │  ▓▓▓▓▓░░░ 58%│       │  ▓▓▓░░░░░ 34%│  ← greyed out           │
│             └──────────────┘       └──────────────┘    (no access)          │
│                                                                             │
│  Legend: ▓ Complete  ░ Remaining  [Click step to begin]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 8.0.2 Step Box Component

```xml
<StepBox 
  bind:step="step"
  bind:userAccess="access"
  on:click="handleStepClick"
>
  <!-- Visual states based on access and progress -->
  <Box 
    :class="{
      'step-box': true,
      'step-accessible': access.canWork,
      'step-greyed': !access.canWork,
      'step-complete': step.progress >= 1.0,
      'step-active': step.hasAssignedTasks
    }"
  >
    <!-- Step icon based on type -->
    <StepIcon :type="step.type" />
    
    <!-- Step name -->
    <Text variant="heading" size="sm">{step.name}</Text>
    
    <!-- Progress bar -->
    <ProgressBar 
      :value="step.progress" 
      :color="access.canWork ? 'primary' : 'muted'"
    />
    
    <!-- Progress text -->
    <Text size="xs" color="muted">
      {formatPercent(step.progress)} ({step.completedTasks} / {step.totalTasks})
    </Text>
    
    <!-- Access indicator -->
    <Show when="!access.canWork">
      <Tooltip content={access.reason}>
        <LockIcon size="sm" />
      </Tooltip>
    </Show>
    
    <!-- Active task indicator for annotators -->
    <Show when="access.canWork && step.userAssignedCount > 0">
      <Badge variant="info">{step.userAssignedCount} assigned to you</Badge>
    </Show>
  </Box>
</StepBox>
```

#### 8.0.3 Access Control Display

Steps are displayed differently based on user permissions:

| User Access | Visual State | Click Behavior |
|-------------|--------------|----------------|
| Can work on step | Full color, clickable | Opens task or task list |
| Has view-only access | Muted color, clickable | Opens read-only task list |
| No access | Greyed out, non-clickable | Tooltip explains why |
| Step not yet reachable | Faded, dashed border | "Waiting for previous step" |

**Access reasons displayed in tooltip:**
- "Requires skill: Medical Coding (Expert)"
- "Requires role: Adjudicator"
- "Restricted to Team: Quality Review"
- "Step not yet active"
- "You have reached max concurrent tasks"

#### 8.0.4 Annotator Click Behavior

When an **annotator** clicks an accessible step:

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back to Workflow]                    Task 1 of 12 assigned  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │                   [ANNOTATION LAYOUT]                       ││
│  │                                                             ││
│  │              (Rendered from Layout DSL)                     ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Skip]  [Save Draft]              [Submit & Next →]           │
│                                                                 │
│  Keyboard: Ctrl+Enter to submit, Ctrl+S to save, Esc to skip   │
└─────────────────────────────────────────────────────────────────┘
```

**Task assignment flow:**

```rust
// When annotator clicks a step
async fn handle_annotator_step_click(
    user_id: Uuid,
    step_id: Uuid,
    project_id: Uuid,
) -> Result<AnnotatorStepResponse> {
    // Check for existing assigned tasks first
    let assigned = get_user_assigned_tasks(user_id, step_id).await?;
    
    if !assigned.is_empty() {
        // Resume existing assignment
        return Ok(AnnotatorStepResponse::OpenTask { 
            task: assigned[0].clone(),
            queue_position: 1,
            queue_total: assigned.len(),
        });
    }
    
    // Try to assign a new task
    let new_task = assign_next_task(user_id, step_id, project_id).await?;
    
    match new_task {
        Some(task) => Ok(AnnotatorStepResponse::OpenTask { 
            task,
            queue_position: 1,
            queue_total: 1,
        }),
        None => Ok(AnnotatorStepResponse::NoTasksAvailable {
            reason: "All tasks are assigned or completed",
            estimated_availability: estimate_next_available(step_id).await?,
        }),
    }
}
```

#### 8.0.5 Admin Click Behavior

When an **admin** clicks any step:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [← Back to Workflow]           Step: Adjudication           [⚙️ Settings]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Progress: 340 / 1,000 (34%)    Active Annotators: 5    Avg Time: 4.2 min  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filter: [All States ▼] [All Users ▼] [Date Range ▼]    🔍 Search tasks... │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ □  Task ID        State        Assigned To    Started      Duration    ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ □  TSK-00421     🟡 In Progress  J. Smith     10:42 AM     23 min ⚠️   ││
│  │ □  TSK-00422     🟡 In Progress  M. Johnson   10:58 AM      7 min      ││
│  │ □  TSK-00423     🔵 Assigned     K. Williams  11:02 AM      3 min      ││
│  │ □  TSK-00424     ⚪ Pending      —            —            —           ││
│  │ □  TSK-00425     ⚪ Pending      —            —            —           ││
│  │ □  TSK-00426     🟢 Completed    A. Davis     09:15 AM     5.2 min     ││
│  │ □  TSK-00427     🟢 Completed    J. Smith     09:22 AM     4.8 min     ││
│  │    ...                                                                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Showing 1-50 of 1,000                              [← Prev] [Next →]      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  With selected (2): [Reassign ▼]  [Change Priority]  [Export]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Admin task actions:**

| Action | Description | Confirmation Required |
|--------|-------------|-----------------------|
| **View** | Open task in read-only mode | No |
| **Reassign** | Move task to different user | Yes, if in progress |
| **Evict** | Remove user, return to pool | Yes, warns about lost work |
| **Force Complete** | Mark task complete (admin override) | Yes, requires reason |
| **Reset** | Clear annotations, restart step | Yes, requires reason |
| **Change Priority** | Adjust task priority | No |
| **Add Note** | Attach admin note to task | No |

#### 8.0.6 Evict & Reassign Flow

```xml
<!-- Evict User Dialog -->
<Dialog id="evict-dialog" title="Evict User from Task">
  <Section direction="column" gap="md">
    
    <Alert variant="warning">
      <Text>This will remove <Strong>{assignment.user.name}</Strong> from task 
            <Strong>{task.id}</Strong> and discard any unsaved work.</Text>
    </Alert>
    
    <InfoPanel>
      <InfoRow label="Current Progress">{task.progress}%</InfoRow>
      <InfoRow label="Time Spent">{formatDuration(assignment.duration)}</InfoRow>
      <InfoRow label="Last Activity">{formatRelative(assignment.lastActivity)}</InfoRow>
    </InfoPanel>
    
    <Select 
      bind:value="evictReason" 
      label="Reason for eviction" 
      required="true"
    >
      <Option value="timeout">User exceeded time limit</Option>
      <Option value="inactive">User inactive/unresponsive</Option>
      <Option value="reassign_priority">Need to reassign to specialist</Option>
      <Option value="user_request">User requested removal</Option>
      <Option value="other">Other (specify below)</Option>
    </Select>
    
    <Show when="evictReason === 'other'">
      <TextArea 
        bind:value="evictReasonText" 
        label="Explain reason"
        required="true"
      />
    </Show>
    
    <Divider />
    
    <RadioGroup bind:value="afterEvict" label="After eviction:">
      <Radio value="pool">Return to task pool (auto-assign)</Radio>
      <Radio value="assign">Assign to specific user</Radio>
      <Radio value="hold">Hold for manual assignment</Radio>
    </RadioGroup>
    
    <Show when="afterEvict === 'assign'">
      <UserSelect 
        bind:value="assignToUser"
        label="Assign to"
        :filter="{ 
          hasSkills: step.requiredSkills,
          hasRoles: step.requiredRoles,
          excludeUsers: [assignment.userId]  // Can't reassign to same user
        }"
      />
    </Show>
    
  </Section>
  
  <DialogActions>
    <Button variant="ghost" on:click="closeDialog">Cancel</Button>
    <Button variant="destructive" on:click="confirmEvict">
      Evict User
    </Button>
  </DialogActions>
</Dialog>
```

#### 8.0.7 Task State Machine

```
                                    ┌─────────────┐
                                    │   PENDING   │
                                    └──────┬──────┘
                                           │ assign
                                           ▼
                    ┌─────────────────────────────────────────┐
                    │              ASSIGNED                    │
                    │  (user has task, hasn't started)        │
                    └──────┬──────────────────────┬───────────┘
                           │ start                │ timeout/evict
                           ▼                      │
                    ┌─────────────┐               │
                    │ IN_PROGRESS │◄──────────────┤
                    │             │               │
                    └──────┬──────┘               │
                           │                      │
           ┌───────────────┼───────────────┐      │
           │ submit        │ save_draft    │      │
           ▼               ▼               │      │
    ┌─────────────┐ ┌─────────────┐        │      │
    │  SUBMITTED  │ │    DRAFT    │────────┘      │
    └──────┬──────┘ └─────────────┘                │
           │                                       │
           │ (workflow continues)                  ▼
           ▼                              ┌─────────────┐
    ┌─────────────┐                       │  RETURNED   │
    │  COMPLETED  │                       │  TO POOL    │
    └─────────────┘                       └─────────────┘
```

#### 8.0.8 Real-time Updates

The workflow view updates in real-time via WebSocket:

```typescript
// Frontend: Real-time workflow updates
function useWorkflowRealtime(projectId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = connectWebSocket(`/ws/projects/${projectId}/workflow`);
    
    ws.on('step.progress', (data: StepProgressEvent) => {
      // Update step progress in cache
      queryClient.setQueryData(
        ['workflow', projectId, 'steps', data.stepId],
        (old: Step) => ({ ...old, progress: data.progress, completedTasks: data.completedTasks })
      );
    });
    
    ws.on('task.assigned', (data: TaskAssignedEvent) => {
      // Update task list if admin is viewing
      queryClient.invalidateQueries(['workflow', projectId, 'steps', data.stepId, 'tasks']);
    });
    
    ws.on('task.completed', (data: TaskCompletedEvent) => {
      // Animate progress bar update
      triggerProgressAnimation(data.stepId);
    });
    
    return () => ws.disconnect();
  }, [projectId]);
}
```

```rust
// Backend: Broadcast workflow events
impl WorkflowEventBroadcaster {
    pub async fn on_task_completed(&self, task: &Task, step: &WorkflowStep) {
        // Calculate new progress
        let progress = self.calculate_step_progress(step.step_id).await;
        
        // Broadcast to all users viewing this project
        self.broadcast(
            &format!("project:{}", task.project_id),
            WorkflowEvent::StepProgress {
                step_id: step.step_id,
                progress: progress.percentage,
                completed_tasks: progress.completed,
                total_tasks: progress.total,
            }
        ).await;
    }
}
```

#### 8.0.9 Workflow View Permissions

| Role | Can See | Can Click | Click Opens |
|------|---------|-----------|-------------|
| Annotator | All steps | Accessible steps only | Task annotation UI |
| Reviewer | All steps | Review steps | Review UI |
| Adjudicator | All steps | Adjudication steps | Adjudication UI |
| Team Lead | All steps + metrics | All steps | Task list (read) or work UI |
| Project Admin | All steps + metrics | All steps | Task management UI |
| System Admin | Everything | Everything | Full management UI |

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
| Database | PostgreSQL | ACID compliance, JSONB support, source of truth for all data |
| Coordination | Redis | Sessions, distributed locks, pub/sub, read caching (not write path) |
| Search | Meilisearch | Full-text search, typo tolerance, fast indexing |
| Message Bus | NATS | Event distribution to background services |
| Object Storage | S3-compatible | Document/image storage, export artifacts |

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

```xml
<Project id="medical-coding-q1" name="Medical Coding - Q1 2025">
  
  <!-- PROJECT-LEVEL GOALS -->
  <Goals>
    <Goal id="volume" type="volume" required="true">
      <Name>Complete 10,000 Records</Name>
      <Target>10000</Target>
      <Unit>tasks</Unit>
      <CountingRule>
        <Status>completed</Status>
        <DedupeBy>task</DedupeBy>
      </CountingRule>
    </Goal>
    
    <Goal id="quality" type="quality" required="true">
      <Name>85% Inter-Annotator Agreement</Name>
      <Metric>agreement:krippendorff_alpha</Metric>
      <Threshold>0.85</Threshold>
      <MinSampleSize>100</MinSampleSize>
      <EvaluationWindow type="rolling" size="500" />
      <MeasuredAt step="agreement_check" trigger="on_step_complete" />
    </Goal>
    
    <Goal id="deadline" type="deadline" required="true">
      <Name>Q1 Delivery</Name>
      <Deadline>2025-03-31T23:59:59Z</Deadline>
      <Warnings>
        <Warning at="P14D">Two weeks remaining</Warning>
        <Warning at="P3D">Three days remaining</Warning>
      </Warnings>
    </Goal>
    
    <!-- Project is complete when: (volume AND quality) OR deadline -->
    <Goal id="project_complete" type="composite" required="true">
      <Operator>or</Operator>
      <Goals>
        <CompositeGoal operator="and">
          <GoalRef>volume</GoalRef>
          <GoalRef>quality</GoalRef>
        </CompositeGoal>
        <GoalRef>deadline</GoalRef>
      </Goals>
    </Goal>
  </Goals>
  
  <!-- WORKFLOW DEFINITION -->
  <Workflow id="dual-annotation-adjudication" name="Dual Annotation with Adjudication">
    <Steps>
      
      <!-- Step 1: Initial coding by 2 annotators -->
      <Step id="initial_coding" name="Initial Coding" type="annotation">
        <Layout ref="medical_coding_layout" />
        
        <!-- When can this task move forward? 2 annotators done. -->
        <CompletionCriteria type="annotation_count">
          <Count>2</Count>
          <UniqueAnnotators>true</UniqueAnnotators>
        </CompletionCriteria>
        
        <!-- How does this step contribute to project goals? -->
        <GoalContributions>
          <Contribution goal="volume">
            <Type>count</Type>
            <Metric>completed_tasks</Metric>
            <Aggregation>sum</Aggregation>
          </Contribution>
          <Contribution goal="quality">
            <Type>quality_metric</Type>
            <Metric>pairwise_agreement</Metric>
          </Contribution>
        </GoalContributions>
        
        <Assignment>
          <Mode>auto</Mode>
          <PreventReassignment>true</PreventReassignment>
          <RequiredSkills>
            <Skill name="medical_coding" minProficiency="intermediate" />
          </RequiredSkills>
        </Assignment>
        
        <Hooks>
          <PreProcess>
            <Hook id="ai-suggestions" plugin="@ensemble/ai-prefill">
              <Config>
                <Model>clinical-coder-v2</Model>
                <Fields>diagnosis_codes,procedure_codes</Fields>
              </Config>
            </Hook>
          </PreProcess>
        </Hooks>
      </Step>
      
      <!-- Step 2: Automatic agreement check -->
      <Step id="agreement_check" name="Agreement Check" type="auto_process">
        <Handler>@core/agreement-calculator</Handler>
        <Config>
          <Metric>agreement:krippendorff_alpha</Metric>
          <Threshold>0.9</Threshold>
        </Config>
        
        <CompletionCriteria type="auto" />
        
        <!-- This step MEASURES quality but doesn't produce volume -->
        <GoalContributions>
          <Contribution goal="quality">
            <Type>quality_metric</Type>
            <Metric>calculated_agreement</Metric>
            <Aggregation>latest</Aggregation>
          </Contribution>
        </GoalContributions>
      </Step>
      
      <!-- Step 3: Adjudication for disagreements -->
      <Step id="adjudication" name="Adjudication" type="adjudication">
        <Layout ref="adjudication_layout" />
        
        <CompletionCriteria type="annotation_count">
          <Count>1</Count>
        </CompletionCriteria>
        
        <Assignment>
          <Mode>auto</Mode>
          <PreventReassignment>true</PreventReassignment>
          <RequiredSkills>
            <Skill name="medical_coding" minProficiency="expert" />
          </RequiredSkills>
          <RequiredRoles>
            <Role>adjudicator</Role>
          </RequiredRoles>
        </Assignment>
      </Step>
      
    </Steps>
    
    <Transitions>
      <Transition from="initial_coding" to="agreement_check">
        <Condition type="on_complete" />
      </Transition>
      
      <Transition from="agreement_check" to="completed">
        <Condition type="expression">
          <Expression>$.step_output.agreement_score >= 0.9</Expression>
        </Condition>
      </Transition>
      
      <Transition from="agreement_check" to="adjudication">
        <Condition type="expression">
          <Expression>$.step_output.agreement_score &lt; 0.9</Expression>
        </Condition>
      </Transition>
      
      <Transition from="adjudication" to="completed">
        <Condition type="on_complete" />
      </Transition>
    </Transitions>
    
  </Workflow>
</Project>
```

### B.2 Continuous Labeling Project (Volume + Deadline Goals)

```xml
<Project id="continuous-labeling-2025" name="Continuous Data Labeling">
  
  <Goals>
    <!-- Volume goal: 50k annotations -->
    <Goal id="volume" type="volume" required="true">
      <Name>50,000 Labeled Items</Name>
      <Target>50000</Target>
      <Unit>annotations</Unit>
      <CountingRule>
        <Status>approved</Status>
      </CountingRule>
    </Goal>
    
    <!-- Deadline: end of Q1 -->
    <Goal id="deadline" type="deadline" required="true">
      <Deadline>2025-03-31T23:59:59Z</Deadline>
    </Goal>
    
    <!-- Project done when volume reached OR deadline hits -->
    <Goal id="complete" type="composite" required="true">
      <Operator>or</Operator>
      <Goals>
        <GoalRef>volume</GoalRef>
        <GoalRef>deadline</GoalRef>
      </Goals>
    </Goal>
  </Goals>
  
  <Workflow id="label-review" name="Label with Review">
    <Steps>
      
      <Step id="label" name="Label Data" type="annotation">
        <Layout ref="classification_layout" />
        
        <CompletionCriteria type="annotation_count">
          <Count>1</Count>
        </CompletionCriteria>
        
        <GoalContributions>
          <Contribution goal="volume">
            <Type>count</Type>
            <Metric>submitted_annotations</Metric>
          </Contribution>
        </GoalContributions>
        
        <Assignment>
          <Mode>pool</Mode>
          <LoadBalancing>quality_weighted</LoadBalancing>
          <MaxConcurrentPerUser>10</MaxConcurrentPerUser>
        </Assignment>
      </Step>
      
      <!-- 10% sample review -->
      <Step id="review" name="Quality Review" type="review">
        <Layout ref="review_layout" />
        <SampleRate>0.10</SampleRate>
        
        <CompletionCriteria type="review_decision" />
        
        <Assignment>
          <RequiredRoles>
            <Role>reviewer</Role>
          </RequiredRoles>
        </Assignment>
      </Step>
      
    </Steps>
    
    <Transitions>
      <Transition from="label" to="review">
        <Condition type="sample" rate="0.10" />
      </Transition>
      <Transition from="label" to="completed">
        <Condition type="on_complete" />
      </Transition>
      <Transition from="review" to="completed">
        <Condition type="on_complete" />
      </Transition>
    </Transitions>
  </Workflow>
</Project>
```

### B.3 Quality-Driven NER Project

```xml
<Project id="ner-quality-driven" name="Clinical NER - Quality Driven">
  
  <Goals>
    <!-- Primary goal: achieve and maintain high agreement -->
    <Goal id="quality" type="quality" required="true">
      <Name>90% Token-Level Agreement</Name>
      <Metric>agreement:token_f1</Metric>
      <Threshold>0.90</Threshold>
      <MinSampleSize>200</MinSampleSize>
      <EvaluationWindow type="rolling" size="500" />
      <MeasuredAt step="annotate" trigger="on_step_complete" />
      <SustainedPeriod>P7D</SustainedPeriod>  <!-- Must maintain for 7 days -->
    </Goal>
    
    <!-- Minimum volume -->
    <Goal id="min_volume" type="volume" required="true">
      <Target>5000</Target>
      <Unit>tasks</Unit>
    </Goal>
    
    <!-- Manual signoff required -->
    <Goal id="signoff" type="manual" required="true">
      <AuthorizedRoles>
        <Role>project_admin</Role>
        <Role>data_science_lead</Role>
      </AuthorizedRoles>
      <Checklist>
        <Item>Quality metrics sustained for 7+ days</Item>
        <Item>Sample audit completed</Item>
        <Item>Model training validated on dataset</Item>
      </Checklist>
    </Goal>
    
    <!-- Complete when: quality sustained AND min volume AND manual signoff -->
    <Goal id="complete" type="composite" required="true">
      <Operator>and</Operator>
      <Goals>
        <GoalRef>quality</GoalRef>
        <GoalRef>min_volume</GoalRef>
        <GoalRef>signoff</GoalRef>
      </Goals>
    </Goal>
  </Goals>
  
  <Workflow id="dual-ner" name="Dual NER Annotation">
    <Steps>
      <Step id="annotate" name="NER Annotation" type="annotation">
        <Layout ref="clinical-ner-v1" />
        
        <CompletionCriteria type="annotation_count">
          <Count>2</Count>
          <UniqueAnnotators>true</UniqueAnnotators>
        </CompletionCriteria>
        
        <GoalContributions>
          <Contribution goal="min_volume">
            <Type>count</Type>
            <Metric>completed_tasks</Metric>
          </Contribution>
          <Contribution goal="quality">
            <Type>quality_metric</Type>
            <Metric>token_f1_agreement</Metric>
          </Contribution>
        </GoalContributions>
        
        <ConsensusConfig>
          <Metric>agreement:token_f1</Metric>
          <Threshold>0.85</Threshold>
          <OnAgreement action="complete" />
          <OnDisagreement>
            <Strategy>adjudication</Strategy>
          </OnDisagreement>
        </ConsensusConfig>
      </Step>
    </Steps>
  </Workflow>
</Project>
```

### B.4 NER Annotation Layout

```xml
<Layout id="clinical-ner-v1" name="Clinical NER Layout" version="1">
  
  <!-- Task metadata header -->
  <Section direction="row" justify="between" padding="sm" background="subtle">
    <Text bind:content="$.input.document_id" variant="mono" size="sm" />
    <Badge bind:variant="$.input.priority">
      <Text bind:content="$.input.priority" />
    </Badge>
  </Section>
  
  <!-- Main content area -->
  <Section direction="column" gap="lg" padding="md" flex="1">
    
    <!-- Document display -->
    <Panel title="Source Document" collapsible="false">
      <TextDisplay 
        bind:source="$.input.document_text"
        format="plain"
        :highlight-ranges="$.ui_context.ai_highlights"
        font="reading"
      />
    </Panel>
    
    <!-- NER annotation -->
    <Panel title="Entity Annotation" flex="1">
      <NERTagger
        bind:source="$.input.document_text"
        bind:value="$.output.entities"
        :allow-overlapping="false"
        show-entity-count="true"
      >
        <EntityType name="Diagnosis" color="#FF6B6B" hotkey="d">
          <Description>Medical diagnoses and conditions</Description>
          <Examples>diabetes, hypertension, pneumonia</Examples>
        </EntityType>
        <EntityType name="Medication" color="#4ECDC4" hotkey="m">
          <Description>Drug names and dosages</Description>
          <Examples>metformin 500mg, lisinopril</Examples>
        </EntityType>
        <EntityType name="Procedure" color="#45B7D1" hotkey="p">
          <Description>Medical procedures and tests</Description>
          <Examples>MRI, blood panel, appendectomy</Examples>
        </EntityType>
        <EntityType name="Anatomy" color="#96CEB4" hotkey="a">
          <Description>Body parts and anatomical structures</Description>
          <Examples>left ventricle, femur, lungs</Examples>
        </EntityType>
      </NERTagger>
      
      <!-- AI suggestions panel -->
      <Show when="$.ui_context.ai_predictions.length > 0">
        <Divider margin="md" />
        <AIAssistPanel 
          bind:predictions="$.ui_context.ai_predictions"
          on:accept="acceptPrediction"
          on:reject="rejectPrediction"
          title="AI Suggestions"
        />
      </Show>
    </Panel>
    
  </Section>
  
  <!-- Bottom metadata -->
  <Section direction="row" gap="md" padding="md">
    <Select
      bind:value="$.output.confidence"
      label="Confidence"
      required="true"
      flex="1"
    >
      <Option value="high">High</Option>
      <Option value="medium">Medium</Option>
      <Option value="low">Low</Option>
    </Select>
    
    <Select
      bind:value="$.output.document_quality"
      label="Document Quality"
      flex="1"
    >
      <Option value="good">Good - Clear and complete</Option>
      <Option value="fair">Fair - Some issues but usable</Option>
      <Option value="poor">Poor - Significant problems</Option>
    </Select>
    
    <TextArea
      bind:value="$.output.notes"
      label="Notes (optional)"
      placeholder="Any issues or observations..."
      :rows="2"
      flex="2"
    />
  </Section>
  
  <!-- Validation messages -->
  <Show when="$.validation.errors.length > 0">
    <Alert variant="error" margin="md">
      <ForEach items="$.validation.errors" as="error">
        <Text bind:content="error.message" />
      </ForEach>
    </Alert>
  </Show>
  
</Layout>
```

### B.5 Quality Evaluator Configuration

```xml
<QualityConfig project="medical-coding-project">
  
  <Evaluators>
    <!-- Inter-annotator agreement -->
    <Evaluator 
      id="iaa" 
      type="builtin" 
      builtinType="agreement:krippendorff_alpha"
      weight="0.4"
    >
      <Parameters>
        <Metric>nominal</Metric>
        <BootstrapSamples>1000</BootstrapSamples>
        <MinAnnotations>2</MinAnnotations>
      </Parameters>
      <Scope level="field">
        <Fields>$.diagnosis_codes,$.procedure_codes</Fields>
      </Scope>
    </Evaluator>
    
    <!-- Custom medical coding accuracy -->
    <Evaluator 
      id="coding_accuracy" 
      type="plugin" 
      pluginId="medical:coding_accuracy"
      weight="0.4"
    >
      <Parameters>
        <CodeSystem>ICD-10</CodeSystem>
        <HierarchyCredit>true</HierarchyCredit>
        <SpecificityWeight>0.3</SpecificityWeight>
      </Parameters>
    </Evaluator>
    
    <!-- Completeness check -->
    <Evaluator 
      id="completeness" 
      type="builtin" 
      builtinType="completeness:required_fields"
      weight="0.2"
    >
      <Parameters>
        <RequiredFields>
          diagnosis_codes,
          procedure_codes,
          confidence
        </RequiredFields>
      </Parameters>
    </Evaluator>
  </Evaluators>
  
  <Aggregation method="weighted_mean">
    <ExcludeBelowConfidence>0.5</ExcludeBelowConfidence>
    <OutlierHandling>winsorize</OutlierHandling>
  </Aggregation>
  
  <Scheduling trigger="on_submit">
    <DelayAfterSubmit>PT5M</DelayAfterSubmit>
    <BatchSize>50</BatchSize>
    <ReevaluateOn>annotation.approved,annotation.rejected</ReevaluateOn>
  </Scheduling>
  
  <Rules>
    <Rule name="Low Quality Alert">
      <Condition>
        <Metric>overall</Metric>
        <Operator>lt</Operator>
        <Value>0.7</Value>
        <Window>P1D</Window>
        <MinSampleSize>20</MinSampleSize>
        <Scope>user</Scope>
      </Condition>
      <Actions>
        <Action type="alert">
          <Channel>slack</Channel>
          <Message>User quality dropped below 70%</Message>
        </Action>
        <Action type="notify">
          <Target>team_lead</Target>
        </Action>
      </Actions>
    </Rule>
    
    <Rule name="Auto-approve High Quality">
      <Condition type="composite" operator="and">
        <Condition>
          <Metric>coding_accuracy</Metric>
          <Operator>gte</Operator>
          <Value>0.95</Value>
        </Condition>
        <Condition>
          <Metric>completeness</Metric>
          <Operator>eq</Operator>
          <Value>1.0</Value>
        </Condition>
      </Condition>
      <Actions>
        <Action type="workflow_action">
          <ActionName>auto_approve</ActionName>
          <SkipReview>true</SkipReview>
        </Action>
      </Actions>
    </Rule>
  </Rules>
  
</QualityConfig>
```
