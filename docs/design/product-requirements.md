# Data Annotation Platform Requirements Specification

## Executive Summary

> **Section Summary:** The Executive Summary provides a high-level roadmap of the Data Annotation Platform, covering its 5-phase data lifecycle (ingestion → distribution → annotation → quality control → export), all 14 feature sections with their key models and enumerations, a cross-reference validation matrix tracking implementation status across SQL/Rust/WIT/TypeScript layers, and canonical definitions for all status enums to ensure consistency throughout the document.

### Platform Overview

The **Data Annotation Platform** is a comprehensive system for managing human annotation of data for machine learning. It handles the complete lifecycle:

1. **Data Ingestion** → Tasks created from various sources (API, S3, databases)
2. **Work Distribution** → Tasks assigned to qualified annotators based on skills
3. **Annotation** → Annotators create labels using configurable UI layouts
4. **Quality Control** → Reviews, adjudication, and quality scoring
5. **Output** → Labeled data exported for ML training

---

### Feature Areas

#### §1 Overview
Design principles and system goals.

#### §2 User & Team Management
**Purpose**: Manage people, their capabilities, and their permissions.

| Feature | Description |
|---------|-------------|
| **User Model** | Identity (user_id, email, display_name) with status tracking |
| **Skills** | Domain expertise with proficiency levels (novice → expert) and certification |
| **Roles** | Permission sets (annotator, reviewer, adjudicator, team_lead, team_manager, project_admin, system_admin) |
| **RBAC Permissions** | Resource + action + scope (e.g., "can approve annotations in own team") |
| **Teams** | Hierarchical groups with leader, manager, members, and specializations |
| **Assignment Rules** | Automatic matching of tasks to qualified users with scoring algorithms |
| **Quality Profiles** | Per-user historical quality metrics |

**Key Models**: User, Skill, Role, Permission, Team, TeamMembership, AssignmentRule, QualityProfile

---

#### §3 Project & Project Types
**Purpose**: Container for annotation work and reusable configurations.

| Feature | Description |
|---------|-------------|
| **Project** | Single annotation effort with lifecycle (draft → active → paused → completed → archived) |
| **ProjectType** | Reusable template defining schemas, skill requirements, and default workflow |
| **Task Schema** | JSON Schema defining what input data looks like |
| **Annotation Schema** | JSON Schema defining what annotations should contain |
| **Skill Requirements** | Which skills (and proficiency) are needed to work on this project type |
| **Data Sources** | Configuration for ingesting tasks (API, S3, database, manual upload) |
| **Quality Criteria** | Minimum agreement, accuracy, and validation rules |

**Key Models**: Project, ProjectType, DataSourceConfig, QualityCriteria

---

#### §4 Workflow Engine
**Purpose**: Define how annotation work flows through stages.

| Feature | Description |
|---------|-------------|
| **Workflow Types** | Predefined patterns: single, multi_vote, multi_adjudication, custom DAG |
| **Workflow Steps** | Individual stages with type (annotation, review, adjudication, auto_process, conditional, sub_workflow) |
| **Nested Workflows** | Workflows can reference other workflows as steps with clear entry/exit points |
| **Step Completion Criteria** | When a task can proceed: annotation count, consensus, timeout handling |
| **Transitions** | Conditional rules for moving between steps |
| **Project Goals** | Targets: volume (task count), quality (accuracy), deadline, duration, composite |
| **Goal Tracking** | Progress calculation, forecasting, threshold alerts |
| **Duplicate Prevention** | Ensure same user doesn't annotate same task twice |

**Key Models**: Workflow, WorkflowStep, Transition, StepCompletionCriteria, ConsensusConfig, ProjectGoal, GoalProgress

**Key Enums**: step_type, goal_type

---

#### §5 Layout & Component System
**Purpose**: Define the UI annotators see and interact with.

| Feature | Description |
|---------|-------------|
| **Three-Tier Architecture** | Primitives → Composites → Annotation Layouts |
| **Primitive Components** | Basic UI: TextInput, Select, Checkbox, Button, etc. |
| **Composite Components** | Complex annotation: NERTagger, BoundingBox, Classification, RelationAnnotator |
| **Layout Formats** | Templates: Nunjucks (like Jinja2), MDX (Markdown+JSX), TSX (full React) |
| **Template Processing** | Data binding from task input to layout variables |
| **Layout Schemas** | JSON Schema defining what data the layout collects |
| **Validation** | Schema enforcement for annotations |
| **Inheritance** | Base layouts with overrides |
| **Versioning** | Track layout changes, migrations |

**Key Models**: Layout, Component, ComponentRegistry, LayoutVersion

**Key Enum**: layout_format (nunjucks, mdx, tsx)

---

#### §6 Task Management
**Purpose**: Track individual units of work through their lifecycle.

| Feature | Description |
|---------|-------------|
| **Task Model** | Unit of work with input data, workflow state, priority |
| **Task Lifecycle** | pending → assigned → in_progress → review → adjudication → completed/failed/cancelled |
| **Workflow State** | Current step, per-step state, context data |
| **Task Assignment** | User assigned to task for specific step, with acceptance workflow |
| **Assignment Lifecycle** | assigned → accepted → in_progress → submitted/expired/reassigned |
| **Annotation** | The actual labeled data with versioning |
| **Annotation Lifecycle** | draft → submitted → approved/rejected/superseded |
| **Audit Trail** | Complete history of all changes with actor, timestamp, field changes |
| **Time Tracking** | Duration spent on each annotation |

**Key Models**: Task, WorkflowState, StepState, TaskAssignment, Annotation, AuditEntry, FieldChange

**Key Enums**: task_status, assignment_status, annotation_status, step_status, actor_type

---

#### §7 Quality Management
**Purpose**: Measure and ensure annotation quality.

| Feature | Description |
|---------|-------------|
| **Quality Score Model** | Scores for tasks, users, and projects with confidence intervals |
| **Task Quality** | Per-annotation quality based on agreement, review outcomes, gold comparison |
| **User Quality** | Historical quality profile: accuracy, consistency, agreement rate |
| **Quality Evaluators** | Configurable calculation methods |
| **Inter-Annotator Agreement** | Cohen's Kappa, Fleiss' Kappa, percentage agreement |
| **Gold Standard** | Comparison against known-correct annotations |
| **Quality Actions** | Automated responses: reassignment, alerts, workflow triggers |

**Key Models**: QualityScore, QualityEvaluator, QualityAction, QualityProfile

---

#### §7A Annotation Storage Architecture
**Purpose**: PostgreSQL persistence layer with scalability and audit.

| Feature | Description |
|---------|-------------|
| **Partitioning** | Tables partitioned by project_id for isolation and maintenance |
| **JSONB Storage** | Flexible annotation data without schema migrations |
| **Event Sourcing** | Append-only event log for complete audit trail |
| **Materialized Views** | Pre-computed aggregations for reporting |
| **Instrumentation** | Fine-grained interaction events for productivity analytics and ML training data |
| **Indexes** | Optimized for common query patterns |
| **Data Lifecycle** | Retention policies, archival, deletion |

**Key Tables**: users, tasks, task_assignments, annotations, annotation_events, interaction_events, assignment_metrics, quality_scores

**SQL Enum Types**: annotation_status, task_status, assignment_status, user_status, step_type, step_status, actor_type, project_status, goal_type, quality_entity_type, workflow_type, completion_criteria_type, consensus_method, resolution_strategy, assignment_mode, load_balancing_strategy, contribution_type, aggregation_type, transition_condition_type, timeout_action

---

#### §8 Dashboard & Reporting
**Purpose**: UI for monitoring progress and managing work.

| Feature | Description |
|---------|-------------|
| **Workflow UI** | Task queue, annotation interface, submission flow |
| **Annotator Dashboard** | My tasks, my stats, my quality scores |
| **Team Lead Dashboard** | Team tasks, team stats, workload balancing |
| **Project Admin Dashboard** | Project progress, quality trends, goal tracking |
| **System Admin Dashboard** | All projects, system health, user management |
| **Rollup Hierarchy** | Aggregation: task → user → team → project → organization |
| **Report Types** | Progress, quality, productivity reports |

**Key Views**: DashboardConfig, ReportDefinition

---

#### §9 Extensibility & Hooks
**Purpose**: Plugin system for customization without core changes.

| Feature | Description |
|---------|-------------|
| **Workflow Hooks** | Pre/post entire workflow execution |
| **Step Hooks** | Pre-process (AI prefill), post-process (external calls), validation |
| **Assignment Hooks** | Custom routing logic |
| **UI Hooks** | AI assist during annotation, live validation, data enrichment |
| **Hook Registration** | Configuration per project/workflow/step |
| **Built-in Hooks** | Library of common hooks |
| **Plugin Runtimes** | WASM (sandboxed), JavaScript (Deno), React (frontend) |

**Key Models**: Hook, HookConfig, PluginDefinition

---

#### §10 Integration & API
**Purpose**: External system connectivity.

| Feature | Description |
|---------|-------------|
| **REST API** | Full CRUD for all resources |
| **WebSocket** | Real-time updates (assignments, notifications) |
| **Event System** | Internal pub/sub for decoupling |
| **Webhooks** | Push notifications to external systems |

**Key Events**: task.created, annotation.submitted, quality.evaluated, etc.

---

#### §11 Security & Compliance
**Purpose**: Authentication, authorization, audit, compliance.

| Feature | Description |
|---------|-------------|
| **Authentication** | JWT-based with refresh tokens |
| **SSO** | OAuth2/OIDC integration |
| **Authorization** | RBAC from §2 enforced on all operations |
| **Audit Logging** | All operations logged with actor, action, resource |
| **Encryption** | At rest (AES-256) and in transit (TLS 1.3) |
| **Compliance** | HIPAA, SOC2 features |

---

#### §12 Non-Functional Requirements
**Purpose**: Performance, scalability, reliability targets.

| Requirement | Target |
|-------------|--------|
| API Response Time | < 100ms p95 |
| Concurrent Users | 10,000+ |
| Uptime | 99.9% |
| Data Durability | 99.999999999% |
| RTO | < 4 hours |
| RPO | < 1 hour |

---

#### §13 Technical Architecture
**Purpose**: Implementation details and code structure.

| Layer | Technology |
|-------|------------|
| Backend | Rust + Axum |
| Database | PostgreSQL 15+ |
| Cache | Redis 7+ |
| Message Bus | NATS |
| Frontend | React 18 + TypeScript 5 |
| Plugin Runtime | WASM (wasmtime) + JavaScript (Deno) |

**Subsections**:
- §13.1: Directory structure
- §13.2: Rust backend (Cargo.toml, domain models, services)
- §13.3: React frontend (package.json, components, state management)
- §13.4: Plugin system (WIT interfaces, WASM runtime, JS runtime, TypeScript SDK)
- §13.5: Full implementation examples

---

### Core Data Models

| Model | Canonical Definition | Key Fields | Implemented In |
|-------|---------------------|------------|----------------|
| User | §2.1 | user_id, email, skills[], roles[], quality_profile, availability | §13.2.3 (Rust) |
| Team | §2.2 | team_id, members[], capacity, specializations | — |
| Project | §3.1 | project_id, workflow_id, goals[], data_source | — |
| ProjectType | §3.2 | type_id, task_schema, annotation_schema, skill_requirements | — |
| Workflow | §4.1 | workflow_id, steps[], transitions[], hooks, settings | — |
| WorkflowStep | §4.3 | step_id, type, layout_id, assignment_config, completion_criteria | — |
| ProjectGoal | §4.4 | goal_id, type, target_value, deadline, progress | — |
| Layout | §5.2 | layout_id, format, template_source, schema, settings | — |
| Task | §6.1 | task_id, project_id, status, workflow_state, assignments[], annotations[] | §7A.2 (SQL), §13.2.3 (Rust), §13.4.2 (WIT), §13.4.5 (TS) |
| TaskAssignment | §6.3 | assignment_id, task_id, step_id, user_id, status | §7A.2 (SQL), §13.2.3 (Rust), §13.4.5 (TS) |
| Annotation | §6.4 | annotation_id, task_id, step_id, user_id, assignment_id, data, status, audit_trail[] | §7A.2 (SQL), §13.2.3 (Rust), §13.4.2 (WIT), §13.4.5 (TS) |
| QualityScore | §7.1 | score_id, entity_type, entity_id, value, confidence | §7A.2 (SQL), §13.2.3 (Rust), §13.4.5 (TS) |

---

### Status Enumerations (Canonical Reference)

All status enums must be consistent across: Domain Model (§2-§6), SQL Schema (§7A), Rust (§13.2), WIT (§13.4.2), TypeScript (§13.4.5).

**Core Status Enums:**

| Enum | Canonical Values | Notes |
|------|------------------|-------|
| `user_status` | active, inactive, suspended | User account state |
| `task_status` | pending, assigned, in_progress, review, adjudication, completed, failed, cancelled | Task lifecycle (8 values) |
| `annotation_status` | draft, submitted, approved, rejected, superseded | Annotation state (5 values) |
| `assignment_status` | assigned, accepted, in_progress, submitted, expired, reassigned | Per-step assignment (6 values) |
| `step_status` | pending, active, completed, skipped | Workflow step state (4 values) |
| `step_type` | annotation, review, adjudication, auto_process, conditional, sub_workflow | Step classification (6 values) |
| `project_status` | draft, active, paused, completed, archived | Project lifecycle (5 values) |
| `goal_type` | volume, quality, deadline, duration, composite, manual | Goal classification (6 values) |
| `layout_format` | nunjucks, mdx, tsx | Template language (3 values) — Domain only, not in SQL/Rust/TS |
| `actor_type` | user, system, api | For audit trails (3 values) |

**Workflow Configuration Enums (§4 Domain only):**

| Enum | Canonical Values | Notes |
|------|------------------|-------|
| `workflow_type` | single, multi_vote, multi_adjudication, custom | Predefined workflow patterns |
| `completion_criteria_type` | annotation_count, review_decision, auto, manual | When step completes |
| `consensus_method` | majority_vote, weighted_vote, unanimous | How to determine agreed value |
| `resolution_strategy` | majority_vote, weighted_vote, adjudication, additional_annotators, escalate | How to handle disagreement |
| `assignment_mode` | auto, manual, pool | How tasks are assigned |
| `load_balancing` | round_robin, least_loaded, quality_weighted | Assignment distribution strategy |
| `contribution_type` | count, quality_metric, progress | How step contributes to goals |
| `aggregation` | sum, latest, average, min, max | How to aggregate contributions |
| `transition_condition_type` | always, on_complete, on_agreement, on_disagreement, expression | When transitions fire |
| `timeout_action` | proceed, retry, escalate | What to do on step timeout |
| `proficiency_level` | novice, intermediate, advanced, expert | Skill proficiency levels |

---

### Cross-Reference Validation Matrix

This matrix tracks where each type is defined across all implementation layers.

| Type | §2-§6 Domain | §7A SQL | §13.2 Rust | §13.4.2 WIT | §13.4.5 TS | Status |
|------|--------------|---------|------------|-------------|------------|--------|
| **Core Entities** |
| User | §2.1 ✓ | — | ✓ | — | — | ✓ |
| Team | §2.2 ✓ | — | — | — | — | ⚠️ Not implemented |
| Project | §3.1 ✓ | — | — | — | — | ⚠️ Not implemented |
| ProjectType | §3.2 ✓ | — | — | — | — | ⚠️ Not implemented |
| Workflow | §4.1 ✓ | — | — | — | — | ⚠️ Not implemented |
| WorkflowStep | §4.3 ✓ | — | — | — | — | ⚠️ Not implemented |
| Layout | §5.2 ✓ | — | — | — | — | ⚠️ Not implemented |
| Task | §6.1 ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TaskAssignment | §6.3 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Annotation | §6.4 ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QualityScore | §7.1 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **Status Enums** |
| UserStatus | §2.1 ✓ | ✓ | ✓ | — | — | ✓ |
| TaskStatus | §6.1 ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AssignmentStatus | §6.3 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| AnnotationStatus | §6.4 ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| StepStatus | §6.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| StepType | §4.3 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| ActorType | §6.4 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| ProjectStatus | §3.1 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| GoalType | §4.4 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **Workflow Configuration Enums** |
| WorkflowType | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| CompletionCriteriaType | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| ConsensusMethod | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| ResolutionStrategy | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| AssignmentMode | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| LoadBalancingStrategy | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| ContributionType | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| AggregationType | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| TransitionConditionType | §4.3 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| TimeoutAction | §4.2 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **Supporting Types** |
| WorkflowState | §6.2 ✓ | — | ✓ | — | ✓ | ✓ |
| StepState | §6.2 ✓ | — | ✓ | — | ✓ | ✓ |
| AuditEntry | §6.4 ✓ | ✓ | ✓ | — | ✓ | ✓ |
| FieldChange | §6.4 ✓ | — | ✓ | — | ✓ | ✓ |

**Legend**: ✓ = Defined, — = Not needed/applicable, ⚠️ = Gap to address

---

## 1. Overview

> **Section Summary:** This section establishes the platform's purpose as a customizable, workflow-driven data annotation system and defines five key design principles: configuration over code, extensibility via plugins, quality-first design with built-in metrics, scalability for distributed teams, and full auditability for compliance.

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

> **Section Summary:** This section defines the people model for the platform, including Users with identity, skills (with proficiency levels from novice to expert), and seven hierarchical roles (annotator through system_admin). It covers the RBAC permission model with resource/action/scope granularity, Team structures with leaders/managers/members, automatic assignment rules with scoring algorithms, and supporting types for quality profiles, availability scheduling, and team capacity configuration.

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

```
TeamRole
├── role_id: UUID
├── user_id: UUID
├── team_id: UUID
├── role: Role                     # Reference to system Role (from §2.1.2)
├── scope: enum(team_only, project_scoped)
├── granted_at: timestamp
├── granted_by: UUID
└── expires_at: timestamp          # Optional expiration
```

> **Note:** `TeamMembership.team_role` defines the user's position in team hierarchy (member/lead/manager), while `Team.roles` (`TeamRole[]`) tracks which system Roles are assigned to users within this team context.

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

### 2.4 Supporting Types

#### 2.4.1 Quality Profile

```
QualityProfile
├── overall_score: float           # 0.0-1.0 aggregate quality score
├── accuracy: float                # Historical accuracy rate
├── consistency: float             # Consistency across similar tasks
├── agreement_rate: float          # Agreement with other annotators
├── sample_size: int               # Number of evaluated tasks
├── last_evaluated: timestamp
└── by_skill: Map<UUID, SkillQuality>  # Quality metrics per skill
```

#### 2.4.2 Availability Config

```
AvailabilityConfig
├── schedule: WeeklySchedule       # Regular working hours
├── timezone: string               # User's timezone (IANA format)
├── max_concurrent_tasks: int      # Max tasks user can work on simultaneously
├── daily_capacity: int            # Target tasks per day
└── out_of_office: DateRange[]     # Planned unavailability periods
```

```
WeeklySchedule
├── monday: TimeRange[]
├── tuesday: TimeRange[]
├── wednesday: TimeRange[]
├── thursday: TimeRange[]
├── friday: TimeRange[]
├── saturday: TimeRange[]
└── sunday: TimeRange[]
```

#### 2.4.3 Capacity Config (Team)

```
CapacityConfig
├── target_throughput: float       # Target tasks per day for team
├── max_concurrent_tasks: int      # Max active tasks for entire team
├── buffer_percentage: float       # Capacity buffer (e.g., 0.2 = 20%)
└── auto_scale: boolean            # Allow overflow to other teams
```

---

## 3. Project & Project Type Model

> **Section Summary:** This section defines the container models for annotation work: Projects (with lifecycle states draft→active→paused→completed→archived, goals, and data sources) and ProjectTypes (reusable templates with task/annotation JSON schemas, skill requirements, and quality criteria). Supporting types include DataSourceConfig for ingestion (API, S3, database, manual), ProjectSettings for behavior configuration, and QualityCriteria for minimum agreement/accuracy thresholds.

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
├── goals: ProjectGoal[]           # Project-level objectives (see Section 4.4)
├── data_source: DataSourceConfig
└── settings: ProjectSettings
```

> **Note:** Project goals are fully defined in Section 4.4 with support for volume, quality, deadline, duration, and composite goal types.

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

### 3.3 Supporting Types

#### 3.3.1 Data Source Config

```
DataSourceConfig
├── type: enum(api, s3, database, manual)
├── connection: ConnectionConfig    # Type-specific connection details
├── sync_mode: enum(batch, streaming, manual)
├── schedule: string                # Cron expression for batch sync
├── filters: DataFilter[]           # Optional filters on source data
└── transform: TransformConfig      # Optional data transformation
```

#### 3.3.2 Project Settings

```
ProjectSettings
├── notifications: NotificationConfig
├── auto_assignment: boolean        # Enable automatic task assignment
├── allow_self_assignment: boolean  # Allow users to claim tasks
├── require_review: boolean         # All tasks require review step
├── export_format: enum(json, csv, parquet)
├── retention_days: int             # Data retention period
└── custom_fields: CustomField[]    # Project-specific metadata fields
```

#### 3.3.3 Quality Criteria

```
QualityCriteria
├── min_agreement: float            # Minimum inter-annotator agreement
├── min_accuracy: float             # Minimum accuracy vs gold standard
├── required_fields: string[]       # Fields that must be filled
└── custom_validators: string[]     # Custom validation rule IDs
```

---

## 4. Workflow Engine

> **Section Summary:** This section defines the workflow system that orchestrates annotation work through configurable stages. It covers four predefined workflow types (single, multi_vote, multi_adjudication, custom DAG), six step types (annotation, review, adjudication, auto_process, conditional, sub_workflow), ConsensusConfig for handling multi-annotator agreement/disagreement, nested workflows for composition and reuse, step completion criteria and goal contributions, six project goal types (volume, quality, deadline, duration, composite, manual) with a Rust evaluation engine, conditional transitions, duplicate assignment prevention, and supporting types for settings, input/output mapping, and retry policies.

### 4.1 Workflow Model

```
Workflow
├── workflow_id: UUID
├── name: string
├── type: enum(single, multi_vote, multi_adjudication, custom)
├── entry_step_id: UUID                 # Explicit entry point (for nested workflows)
├── exit_step_ids: UUID[]               # Explicit exit points (for nested workflows)
├── steps: WorkflowStep[]
├── transitions: Transition[]
├── hooks: WorkflowHooks
└── settings: WorkflowSettings
```

**Entry/Exit Points**: Every workflow has explicit entry and exit points to support composition:
- `entry_step_id`: The step where execution begins
- `exit_step_ids`: Steps that represent successful completion (can have multiple for branching)
- When used as a sub-workflow, the parent maps its context to the child's entry and collects output from exit steps

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

**ConsensusConfig Model:**

```
ConsensusConfig
├── metric: string                      # Agreement metric (e.g., "agreement:krippendorff_alpha")
├── threshold: float                    # Agreement threshold (0.0-1.0)
├── on_agreement: OnAgreementConfig
│   ├── action: enum(complete, proceed_to_next)
│   └── consensus_method: enum(majority_vote, weighted_vote, unanimous)
└── on_disagreement: OnDisagreementConfig
    ├── strategy: enum(majority_vote, weighted_vote, adjudication, additional_annotators, escalate)
    ├── max_additional_annotators: int  # For additional_annotators strategy
    └── fallback_strategy: enum(adjudication, escalate)  # If primary strategy fails
```

**Example:**

```xml
<ConsensusConfig>
  <Metric>agreement:krippendorff_alpha</Metric>
  <Threshold>0.85</Threshold>
  
  <!-- When annotators agree -->
  <OnAgreement action="complete">
    <ConsensusMethod>majority_vote</ConsensusMethod>
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

#### 4.2.4 Nested Workflows (Sub-Workflows)

Workflows can reference other workflows as steps, enabling composition and reuse:

```
[Parent Workflow]
    │
    ▼
[Step 1: Annotate] → [Step 2: Sub-Workflow] → [Step 3: Review] → [Complete]
                            │
                            ▼
                     ┌──────────────────────────────────────┐
                     │  [Child Workflow]                    │
                     │                                      │
                     │  [Entry] → [NER] → [Linking] → [Exit]│
                     │                                      │
                     └──────────────────────────────────────┘
```

**Key concepts:**

| Concept | Description |
|---------|-------------|
| **Entry Point** | Every workflow has exactly one entry step where execution begins |
| **Exit Points** | One or more steps that represent successful completion |
| **Context Passing** | Parent passes context to child via `input_mapping`; child returns via `output_mapping` |
| **State Isolation** | Child workflow state is nested within parent's `workflow_state.sub_workflow_states[step_id]` |
| **Recursion Limit** | Maximum nesting depth configurable (default: 5) to prevent infinite loops |

**Sub-Workflow Step Configuration:**

```
SubWorkflowStep extends WorkflowStep
├── type: sub_workflow
├── sub_workflow_id: UUID               # Reference to child workflow
├── input_mapping: InputMapping         # Map parent context → child entry
├── output_mapping: OutputMapping       # Map child exit → parent context
├── propagate_assignment: boolean       # Same user continues in child? (default: true)
└── timeout: duration                   # Overall timeout for child workflow
```

**Example: Reusable NER + Entity Linking sub-workflow:**

```yaml
# Child workflow (reusable)
workflow:
  id: "ner-linking-workflow"
  name: "NER with Entity Linking"
  entry_step_id: "ner-step"
  exit_step_ids: ["linking-complete"]
  steps:
    - id: "ner-step"
      type: annotation
      layout_id: "ner-layout"
    - id: "linking-step"
      type: annotation
      layout_id: "entity-linking-layout"
    - id: "linking-complete"
      type: auto_process  # Merge results

# Parent workflow
workflow:
  id: "document-processing"
  steps:
    - id: "classify"
      type: annotation
      layout_id: "classification-layout"
    - id: "extract-entities"
      type: sub_workflow
      sub_workflow_id: "ner-linking-workflow"
      input_mapping:
        text: "$.output.classified_text"
      output_mapping:
        entities: "$.sub_workflow_output.entities"
        links: "$.sub_workflow_output.links"
    - id: "final-review"
      type: review
```

**State representation for nested workflows:**

```json
{
  "workflow_state": {
    "current_step_id": "extract-entities",
    "step_states": {
      "classify": { "status": "completed", "output": {...} },
      "extract-entities": { 
        "status": "active",
        "sub_workflow_state": {
          "workflow_id": "ner-linking-workflow",
          "current_step_id": "linking-step",
          "step_states": {
            "ner-step": { "status": "completed", "output": {...} },
            "linking-step": { "status": "active" }
          }
        }
      }
    }
  }
}
```

### 4.3 Workflow Step

```
WorkflowStep
├── step_id: UUID
├── name: string
├── type: enum(annotation, review, adjudication, auto_process, conditional, sub_workflow)
├── layout_id: UUID                      # For annotation/review/adjudication steps
├── sub_workflow_id: UUID                # For sub_workflow steps: reference to nested workflow
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

### 4.7 Supporting Types

#### 4.7.1 Workflow Settings

```
WorkflowSettings
├── allow_parallel_steps: boolean   # Allow concurrent step execution
├── max_retries: int                # Default retry count for failed steps
├── default_timeout: duration       # Default step timeout
├── require_completion: boolean     # All steps must complete to finish
└── on_error: enum(pause, skip, escalate)  # Default error handling
```

#### 4.7.2 Input/Output Mapping

```
InputMapping
├── source: enum(task_input, previous_step, workflow_context, static)
├── path: string                    # JSONPath to source data
├── transform: TransformExpression  # Optional transformation
└── default: any                    # Default value if source missing
```

```
OutputMapping
├── target: enum(annotation, workflow_context, task_metadata)
├── path: string                    # JSONPath to target location
├── merge_strategy: enum(replace, merge, append)
└── validation: ValidationRule      # Optional output validation
```

#### 4.7.3 Retry Policy

```
RetryPolicy
├── max_attempts: int               # Maximum retry attempts
├── backoff: enum(fixed, exponential, linear)
├── initial_delay: duration         # Delay before first retry
├── max_delay: duration             # Maximum delay between retries
├── retry_on: string[]              # Error types to retry on
└── on_exhausted: enum(fail, escalate, skip)
```

---


## 5. Layout & Component System

> **Section Summary:** This section defines the UI framework for annotation interfaces through a three-tier component architecture: Tier 1 (TypeScript/React base components like NERTagger, Classification, BoundingBox built by the core team), Tier 2 (Nunjucks/MDX layouts that compose Tier 1 components - accessible to all developers), and Tier 3 (Python/Rust ML services for AI suggestions). It covers the Layout model with three format options (nunjucks, mdx, tsx), the complete Nunjucks template reference with data binding, control flow, and filters, the template processing pipeline that converts templates to React components at runtime, layout validation with JSON Schema, and layout inheritance/versioning for reuse and migration.

### 5.1 Three-Tier Component Architecture

The platform supports contributors across the technology spectrum (TypeScript, Python, Rust) through a tiered component system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Component Contribution Model                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER    WHO                  WHAT                    HOW                   │
│  ──────────────────────────────────────────────────────────────────────────│
│                                                                             │
│   1      Core frontend   ──►  Base Components    ──►  TypeScript/React     │
│          team                 (NERTagger, etc.)      (full control)        │
│                                                                             │
│   2      All developers  ──►  Layouts            ──►  Nunjucks (HTML+Jinja) │
│          (Py/Rust/JS)         (compose tier 1)       (any lang generates)  │
│                                                                             │
│   3      Data science    ──►  ML Services        ──►  Python/Rust          │
│          team                 (AI suggestions)       (server-side)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.1 Tier 1: Base Components (TypeScript/React)

Core annotation primitives written by the frontend team. These are the building blocks that Tier 2 layouts compose.

**Ownership:** Core frontend team only
**Language:** TypeScript + React
**Review:** Full code review, security audit
**Examples:** NERTagger, Classification, BoundingBox, TextArea, AudioPlayer

```tsx
// packages/components/src/annotation/NERTagger.tsx
import { forwardRef, useState, useCallback } from 'react';

export interface Entity {
  id: string;
  start: number;
  end: number;
  type: string;
  text: string;
}

export interface EntityTypeConfig {
  name: string;
  color: string;
  hotkey?: string;
  description?: string;
}

export interface NERTaggerProps {
  /** Source text to annotate */
  source: string;
  /** Current entity annotations */
  value: Entity[];
  /** Called when entities change */
  onChange: (entities: Entity[]) => void;
  /** Allow overlapping entity spans */
  allowOverlapping?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Entity type definitions */
  children?: React.ReactNode;  // EntityType components
  /** Selection event */
  onEntitySelect?: (entity: Entity) => void;
  /** Keyboard shortcuts enabled */
  enableHotkeys?: boolean;
}

export const NERTagger = forwardRef<HTMLDivElement, NERTaggerProps>(
  ({ source, value, onChange, allowOverlapping = false, readOnly = false, children, ...props }, ref) => {
    const entityTypes = useEntityTypesFromChildren(children);
    const [selection, setSelection] = useState<TextSelection | null>(null);
    
    const handleTextSelect = useCallback((sel: TextSelection) => {
      if (readOnly) return;
      setSelection(sel);
    }, [readOnly]);
    
    const handleEntityCreate = useCallback((type: string) => {
      if (!selection) return;
      
      const newEntity: Entity = {
        id: generateId(),
        start: selection.start,
        end: selection.end,
        type,
        text: source.slice(selection.start, selection.end),
      };
      
      if (!allowOverlapping && hasOverlap(value, newEntity)) {
        return; // Reject overlapping
      }
      
      onChange([...value, newEntity]);
      setSelection(null);
    }, [selection, source, value, onChange, allowOverlapping]);
    
    return (
      <div ref={ref} className="ner-tagger">
        <TokenizedText 
          text={source}
          entities={value}
          entityTypes={entityTypes}
          onSelect={handleTextSelect}
          onEntityClick={props.onEntitySelect}
        />
        
        {selection && !readOnly && (
          <EntityTypeSelector
            types={entityTypes}
            onSelect={handleEntityCreate}
            onCancel={() => setSelection(null)}
          />
        )}
        
        <HotkeyHandler
          enabled={props.enableHotkeys}
          types={entityTypes}
          onTypeSelect={handleEntityCreate}
        />
      </div>
    );
  }
);

// Child component for declarative entity type configuration
export const EntityType: React.FC<EntityTypeConfig> = () => null;
```

**Component Library Structure:**

```
packages/
└── @annotation/components/
    ├── annotation/           # Core annotation components
    │   ├── NERTagger.tsx
    │   ├── Classification.tsx
    │   ├── BoundingBox.tsx
    │   ├── Relation.tsx
    │   ├── AudioSegment.tsx
    │   └── index.ts
    ├── layout/               # Layout primitives
    │   ├── Section.tsx
    │   ├── Grid.tsx
    │   ├── Box.tsx
    │   ├── Header.tsx
    │   └── index.ts
    ├── form/                 # Form inputs
    │   ├── Select.tsx
    │   ├── TextArea.tsx
    │   ├── Checkbox.tsx
    │   ├── RadioGroup.tsx
    │   └── index.ts
    ├── display/              # Display components
    │   ├── TextDisplay.tsx
    │   ├── ImageViewer.tsx
    │   ├── PDFViewer.tsx
    │   ├── AudioPlayer.tsx
    │   └── index.ts
    ├── control/              # Control flow (Show, ForEach wrappers)
    │   ├── Show.tsx
    │   ├── ForEach.tsx
    │   ├── Switch.tsx
    │   └── index.ts
    └── index.ts              # Public API
```

**Component Development Workflow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Tier 1 Component Development                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Design      ──►  2. Implement    ──►  3. Document   ──►  4. Review     │
│     - Props API       - TypeScript        - Storybook        - Code review │
│     - Behavior        - Tests             - Props docs       - Security    │
│     - A11y            - Styling           - Examples         - A11y audit  │
│                                                                             │
│                            ▼                                                │
│                                                                             │
│  5. Publish     ──►  6. Register    ──►  7. Available in Nunjucks           │
│     - npm pkg         - Component         - Layouts can use                │
│     - Changelog       - Registry          - Validated                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Tier 2: Layouts (Nunjucks/MDX Templates)

Layouts compose Tier 1 components using template languages. **Any developer** can create layouts using familiar syntax.

**Supported Formats:**

| Format | Extension | Best For |
|--------|-----------|----------|
| **Nunjucks** | `.njk` | Most layouts - familiar Jinja/HTML syntax |
| **MDX** | `.mdx` | Content-heavy layouts with Markdown |

**Ownership:** All developers (project teams)
**Primary Language:** Nunjucks (.njk) — identical syntax to Python's Jinja2
**Alternative:** MDX (.mdx) — Markdown with embedded components
**Review:** Automated validation + optional review
**Examples:** Clinical NER layout, Document Classification layout, Adjudication layout

**Why Nunjucks (Recommended):**

| Aspect | Custom DSL | Nunjucks |
|--------|------------|----------|
| Familiarity | New syntax to learn | Jinja (AI researchers know it) |
| Loops | Custom `<ForEach>` | `{% for %}` (standard) |
| Conditionals | Custom `<Show>` | `{% if %}` (standard) |
| Tooling | Build from scratch | Syntax highlighting, linters exist |
| Generate from Python | Need SDK | Just string templates |
| Generate from Rust | Need SDK | Just string templates |

**Template Syntax:**

```html
{# layouts/clinical-ner-v1.njk #}

<Layout id="clinical-ner-v1">
  <Section direction="column" gap="md">
    <Header level="3">{{ config.title | default("Source Document") }}</Header>
    <TextDisplay source="{{ input.document_text }}" />
  </Section>

  {# Show AI suggestions if available #}
  {% if context.ai_suggestions | length > 0 %}
    <Alert variant="info">
      AI found {{ context.ai_suggestions | length }} potential entities
    </Alert>
    <AISuggestions 
      suggestions="{{ context.ai_suggestions }}"
      onAccept="acceptSuggestion"
      onReject="rejectSuggestion"
    />
  {% endif %}

  <NERTagger 
    source="{{ input.document_text }}" 
    value="{{ output.entities }}"
    allowOverlapping="false"
  >
    {% for et in config.entity_types %}
      <EntityType 
        name="{{ et.name }}" 
        color="{{ et.color }}" 
        hotkey="{{ et.hotkey }}" 
      />
    {% endfor %}
  </NERTagger>

  <Section direction="row" gap="md">
    <Select value="{{ output.confidence }}" label="Confidence" required>
      {% for level in ['high', 'medium', 'low'] %}
        <Option value="{{ level }}">{{ level | capitalize }}</Option>
      {% endfor %}
    </Select>
    
    <TextArea 
      value="{{ output.notes }}" 
      label="Notes"
      placeholder="Any observations..."
    />
  </Section>
</Layout>
```

**Data Context Available in Templates:**

| Variable | Description | Example |
|----------|-------------|---------|
| `input` | Task input data (read-only) | `{{ input.document_text }}` |
| `output` | Annotation output (bound) | `{{ output.entities }}` |
| `context` | Task context (AI, previous annotations) | `{{ context.ai_suggestions }}` |
| `config` | Layout configuration | `{{ config.entity_types }}` |
| `user` | Current user info | `{{ user.name }}` |

**Jinja Features Supported:**

```html
{# Variables #}
{{ input.text }}
{{ config.title | default("Untitled") }}

{# Filters #}
{{ name | capitalize }}
{{ items | length }}
{{ data | json }}
{{ text | truncate(100) }}

{# Conditionals #}
{% if context.ai_suggestions | length > 0 %}
  ...
{% elif context.previous_annotations %}
  ...
{% else %}
  ...
{% endif %}

{# Loops #}
{% for item in input.items %}
  <Card>{{ item.text }}</Card>
{% endfor %}

{% for entity in output.entities %}
  <EntityBadge 
    index="{{ loop.index }}"
    first="{{ loop.first }}"
    last="{{ loop.last }}"
  >
    {{ entity.text }}
  </EntityBadge>
{% endfor %}

{# Includes (reusable partials) #}
{% include "partials/entity-legend.njk" %}

{# Macros (reusable components) #}
{% macro renderQuestion(q, index) %}
  <QuestionCard>
    <Text>{{ index + 1 }}. {{ q.text }}</Text>
    <TextArea value="{{ output.answers[q.id] }}" />
  </QuestionCard>
{% endmacro %}

{% for q in input.questions %}
  {{ renderQuestion(q, loop.index0) }}
{% endfor %}

{# Comments #}
{# This is a comment - won't appear in output #}
```

**Python: Generating Templates**

AI researchers can generate templates programmatically:

```python
# python-sdk/annotation_layouts/generators.py
from dataclasses import dataclass, field
from typing import List, Optional
import json

@dataclass
class EntityType:
    name: str
    color: str
    hotkey: Optional[str] = None

@dataclass  
class NERLayoutGenerator:
    """Generate NER annotation layouts."""
    
    id: str
    name: str
    entity_types: List[EntityType]
    show_ai_suggestions: bool = True
    show_confidence: bool = True
    show_notes: bool = True
    
    def generate_template(self) -> str:
        """Generate Nunjucks template."""
        
        template = f'''<Layout id="{self.id}">
  <Section direction="column" gap="md">
    <Header level="3">{{{{ config.title | default("Source Document") }}}}</Header>
    <TextDisplay source="{{{{ input.document_text }}}}" />
  </Section>
'''
        
        if self.show_ai_suggestions:
            template += '''
  {% if context.ai_suggestions | length > 0 %}
    <AISuggestions 
      suggestions="{{ context.ai_suggestions }}"
      onAccept="acceptSuggestion"
    />
  {% endif %}
'''
        
        template += '''
  <NERTagger 
    source="{{ input.document_text }}" 
    value="{{ output.entities }}"
  >
    {% for et in config.entity_types %}
      <EntityType name="{{ et.name }}" color="{{ et.color }}" hotkey="{{ et.hotkey }}" />
    {% endfor %}
  </NERTagger>
'''
        
        if self.show_confidence or self.show_notes:
            template += '\n  <Section direction="row" gap="md">'
            
            if self.show_confidence:
                template += '''
    <Select value="{{ output.confidence }}" label="Confidence" required>
      {% for level in config.confidence_levels %}
        <Option value="{{ level }}">{{ level | capitalize }}</Option>
      {% endfor %}
    </Select>'''
            
            if self.show_notes:
                template += '''
    <TextArea value="{{ output.notes }}" label="Notes" />'''
            
            template += '\n  </Section>'
        
        template += '\n</Layout>'
        return template
    
    def generate_config(self) -> dict:
        """Generate config object for template."""
        return {
            "title": self.name,
            "entity_types": [
                {"name": et.name, "color": et.color, "hotkey": et.hotkey}
                for et in self.entity_types
            ],
            "confidence_levels": ["high", "medium", "low"],
        }
    
    def save(self, directory: str):
        """Save template and config files."""
        import os
        os.makedirs(directory, exist_ok=True)
        
        # Save template
        with open(f"{directory}/{self.id}.njk", "w") as f:
            f.write(self.generate_template())
        
        # Save config
        with open(f"{directory}/{self.id}.config.json", "w") as f:
            json.dump(self.generate_config(), f, indent=2)
        
        print(f"Generated: {directory}/{self.id}.njk")


# Usage by AI researcher:
layout = NERLayoutGenerator(
    id="clinical-ner-v1",
    name="Clinical NER Annotation",
    entity_types=[
        EntityType("Diagnosis", "#FF6B6B", "d"),
        EntityType("Medication", "#4ECDC4", "m"),
        EntityType("Procedure", "#45B7D1", "p"),
        EntityType("Anatomy", "#96CEB4", "a"),
    ],
    show_ai_suggestions=True,
)

layout.save("layouts/")
```

**Rust: Generating Templates**

```rust
// rust-sdk/src/layouts/ner.rs
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize)]
pub struct EntityType {
    pub name: String,
    pub color: String,
    pub hotkey: Option<char>,
}

#[derive(Serialize)]
pub struct LayoutConfig {
    pub title: String,
    pub entity_types: Vec<EntityType>,
    pub confidence_levels: Vec<String>,
}

pub struct NERLayoutGenerator {
    pub id: String,
    pub name: String,
    pub entity_types: Vec<EntityType>,
}

impl NERLayoutGenerator {
    pub fn generate_template(&self) -> String {
        format!(r#"<Layout id="{}">
  <Section direction="column" gap="md">
    <Header level="3">{{{{ config.title }}}}</Header>
    <TextDisplay source="{{{{ input.document_text }}}}" />
  </Section>

  {{% if context.ai_suggestions | length > 0 %}}
    <AISuggestions suggestions="{{{{ context.ai_suggestions }}}}" />
  {{% endif %}}

  <NERTagger source="{{{{ input.document_text }}}}" value="{{{{ output.entities }}}}">
    {{% for et in config.entity_types %}}
      <EntityType name="{{{{ et.name }}}}" color="{{{{ et.color }}}}" hotkey="{{{{ et.hotkey }}}}" />
    {{% endfor %}}
  </NERTagger>

  <Section direction="row" gap="md">
    <Select value="{{{{ output.confidence }}}}" label="Confidence" required>
      {{% for level in config.confidence_levels %}}
        <Option value="{{{{ level }}}}">{{{{ level | capitalize }}}}</Option>
      {{% endfor %}}
    </Select>
    <TextArea value="{{{{ output.notes }}}}" label="Notes" />
  </Section>
</Layout>"#, self.id)
    }
    
    pub fn generate_config(&self) -> LayoutConfig {
        LayoutConfig {
            title: self.name.clone(),
            entity_types: self.entity_types.clone(),
            confidence_levels: vec!["high".into(), "medium".into(), "low".into()],
        }
    }
    
    pub fn save(&self, directory: &str) -> std::io::Result<()> {
        fs::create_dir_all(directory)?;
        
        fs::write(
            format!("{}/{}.njk", directory, self.id),
            self.generate_template(),
        )?;
        
        fs::write(
            format!("{}/{}.config.json", directory, self.id),
            serde_json::to_string_pretty(&self.generate_config())?,
        )?;
        
        Ok(())
    }
}
```

**Or Just Write Templates Directly:**

For simple layouts, just write the template file directly:

```html
{# layouts/simple-classification.njk #}

<Layout id="simple-classification">
  <Section direction="column" gap="lg">
    
    <TextDisplay source="{{ input.text }}" />
    
    <Classification 
      value="{{ output.label }}"
      options="{{ config.labels | json }}"
      required
    />
    
    {% if config.show_reasoning %}
      <TextArea 
        value="{{ output.reasoning }}" 
        label="Explain your choice"
        rows="3"
      />
    {% endif %}
    
  </Section>
</Layout>
```

#### 5.1.3 Tier 3: ML Services (Server-Side Python/Rust)

Backend services that provide AI-powered features. These run server-side and communicate via API.

**Ownership:** Data science team
**Language:** Python (primary), Rust (performance-critical)
**Review:** Code review + API security review
**Examples:** AI entity suggestions, quality prediction, active learning selection

```python
# services/ml-suggestions/src/handlers/ner_suggestions.py
from fastapi import APIRouter
from pydantic import BaseModel
from transformers import pipeline

router = APIRouter()

class NERRequest(BaseModel):
    text: str
    entity_types: list[str]
    confidence_threshold: float = 0.8

class Entity(BaseModel):
    start: int
    end: int
    type: str
    text: str
    confidence: float

class NERResponse(BaseModel):
    entities: list[Entity]
    model_version: str

# Load model once at startup
ner_pipeline = None

@router.on_event("startup")
async def load_model():
    global ner_pipeline
    ner_pipeline = pipeline(
        "ner",
        model="clinical-ner-bert-v2",
        aggregation_strategy="simple",
    )

@router.post("/api/ml/ner-suggestions", response_model=NERResponse)
async def get_ner_suggestions(request: NERRequest) -> NERResponse:
    """Generate AI entity suggestions for NER annotation."""
    
    results = ner_pipeline(request.text)
    
    entities = [
        Entity(
            start=r["start"],
            end=r["end"],
            type=r["entity_group"],
            text=r["word"],
            confidence=r["score"],
        )
        for r in results
        if r["score"] >= request.confidence_threshold
        and r["entity_group"] in request.entity_types
    ]
    
    return NERResponse(
        entities=entities,
        model_version="clinical-ner-bert-v2",
    )
```

**Integration with Tier 2 layouts:**

```html
{# Layout references ML service via context #}
<Layout id="clinical-ner-with-ai">
  {# ML suggestions loaded into context by platform #}
  {% if context.ai_suggestions | length > 0 %}
    <Alert variant="info">
      AI found {{ context.ai_suggestions | length }} potential entities
    </Alert>
    
    <AISuggestionList
      suggestions="{{ context.ai_suggestions }}"
      onAccept="acceptSuggestion"
      onReject="rejectSuggestion"
    />
  {% endif %}
  
  <NERTagger 
    source="{{ input.document_text }}" 
    value="{{ output.entities }}"
  >
    {# Entity types from config #}
    {% for et in config.entity_types %}
      <EntityType name="{{ et.name }}" color="{{ et.color }}" />
    {% endfor %}
  </NERTagger>
</Layout>
```

**Platform loads ML context before rendering:**

```typescript
// Platform loads ML suggestions before rendering layout
async function loadTaskContext(task: Task, layout: Layout): Promise<TaskContext> {
  const context: TaskContext = {
    task_id: task.id,
    previous_annotations: await loadPreviousAnnotations(task),
    ai_suggestions: [],
  };
  
  // Check if layout uses AI suggestions
  if (layoutUsesAISuggestions(layout)) {
    const mlService = getMLService('ner-suggestions');
    context.ai_suggestions = await mlService.getSuggestions({
      text: task.input.document_text,
      entity_types: layout.entityTypes,
    });
  }
  
  return context;
}
```

#### 5.1.4 Security Model

| Tier | Trust Level | Isolation | Validation | Review |
|------|-------------|-----------|------------|--------|
| **Tier 1: TSX Components** | Fully trusted | Browser sandbox | TypeScript compiler | Full code review |
| **Tier 2: Nunjucks Layouts** | Constrained | Interpreter limits scope | Schema + allowlist | Automated + optional |
| **Tier 3: ML Services** | Trusted (internal) | Network isolation | API schema | Code review |

**Tier 2 (Nunjucks) Security Constraints:**

```typescript
// Nunjucks security rules enforced by runtime
const NUNJUCKS_SECURITY_RULES = {
  // Only allow registered components
  allowedComponents: Object.keys(Components),
  
  // Binding paths must start with $ and can't escape
  bindingPathPattern: /^\$\.(input|output|context|ui)\./,
  
  // No arbitrary JavaScript execution
  expressionAllowlist: [
    'length', 'includes', 'startsWith', 'endsWith',  // String methods
    '>', '<', '>=', '<=', '==', '!=', '&&', '||', '!',  // Operators
    '+', '-', '*', '/',  // Arithmetic
  ],
  
  // No external URLs in props
  disallowedPropPatterns: [
    /^(http|https|javascript|data):/i,
    /<script/i,
  ],
  
  // Max nesting depth
  maxDepth: 20,
  
  // Max iterations in ForEach
  maxIterations: 1000,
};
```

#### 5.1.5 Developer Experience by Role

| Role | Creates | Tools | Workflow |
|------|---------|-------|----------|
| **Frontend Engineer** | Tier 1 components | VS Code, TypeScript, Storybook, Jest | PR → Review → Merge → Publish |
| **Full-Stack Developer** | Tier 2 layouts | VS Code, Python/Rust SDK, Layout Preview | Write/Generate → Validate → Deploy |
| **Data Scientist** | Tier 2 layouts + Tier 3 services | Python SDK, Jupyter, FastAPI | Generate → Build model → Deploy |
| **Project Manager** | Tier 2 layouts (simple) | Layout Builder UI (future) | Visual editor → Preview → Publish |

---

### 5.2 Layout Model

```
Layout
├── layout_id: UUID
├── name: string
├── version: int
├── project_type_id: UUID
├── step_id: UUID                  # Which workflow step this layout is for
├── format: enum(nunjucks, mdx, tsx)  # Template format
├── template_source: string        # Raw template content (.njk, .mdx, .tsx)
├── config: LayoutConfig           # Config object passed to template
├── schema: LayoutSchema           # Input/output Zod schemas
├── validation_rules: ValidationRule[]
└── settings: LayoutSettings
```

**Layout Files:**

```
layouts/
├── clinical-ner-v1/
│   ├── template.njk           # Nunjucks template
│   ├── config.json            # Configuration for template
│   ├── schema.json            # Input/output schema
│   └── README.md              # Documentation
├── document-classification/
│   ├── template.njk
│   ├── config.json
│   └── schema.json
└── complex-annotation/
    └── template.tsx           # TSX for complex layouts
```

**Layout Settings:**

```
LayoutSettings
├── auto_save: boolean             # Enable auto-save drafts
├── auto_save_interval: duration   # Interval for auto-save (default: 30s)
├── show_progress: boolean         # Show completion progress indicator
├── keyboard_shortcuts: boolean    # Enable keyboard navigation
├── confirm_submit: boolean        # Require confirmation before submit
├── allow_skip: boolean            # Allow skipping task without annotation
└── custom_css: string             # Optional custom CSS overrides
```

---

### 5.3 Nunjucks Template Reference

#### 5.3.1 Data Binding

Templates receive a data context with these variables:

```html
{# Read from task input (read-only) #}
<TextDisplay source="{{ input.document_text }}" />
<ImageViewer src="{{ input.image_url }}" />

{# Bind to output (two-way binding handled by runtime) #}
<TextArea value="{{ output.notes }}" />
<Select value="{{ output.confidence }}" />

{# Access task context #}
<Show if="{{ context.previous_annotations | length > 0 }}">
  <PreviousAnnotations data="{{ context.previous_annotations }}" />
</Show>

{# Access layout config #}
{% for et in config.entity_types %}
  <EntityType name="{{ et.name }}" color="{{ et.color }}" />
{% endfor %}

{# Access user info #}
<Text>Annotator: {{ user.name }}</Text>
```

**Context Variables:**

| Variable | Description | Writable |
|----------|-------------|----------|
| `input` | Task input data | No |
| `output` | Annotation output | Yes (via component binding) |
| `context` | Task context (AI suggestions, previous annotations) | No |
| `config` | Layout configuration from config.json | No |
| `user` | Current user info | No |
| `task` | Task metadata (id, priority, etc.) | No |

#### 5.3.2 Control Flow

**Conditionals:**

```html
{# Simple if #}
{% if context.ai_suggestions | length > 0 %}
  <AISuggestions suggestions="{{ context.ai_suggestions }}" />
{% endif %}

{# If-else #}
{% if input.type == "image" %}
  <ImageViewer src="{{ input.url }}" />
{% elif input.type == "pdf" %}
  <PDFViewer src="{{ input.url }}" />
{% else %}
  <TextDisplay source="{{ input.text }}" />
{% endif %}

{# Ternary in attributes #}
<Button variant="{{ 'primary' if output.entities | length > 0 else 'disabled' }}">
  Submit
</Button>
```

**Loops:**

```html
{# Basic loop #}
{% for item in input.items %}
  <Card>
    <Text>{{ item.text }}</Text>
  </Card>
{% endfor %}

{# Loop with index #}
{% for question in input.questions %}
  <QuestionCard>
    <Text>{{ loop.index }}. {{ question.text }}</Text>
    <TextArea value="{{ output.answers[loop.index0] }}" />
  </QuestionCard>
{% endfor %}

{# Loop variables available #}
{# loop.index     - 1-based index #}
{# loop.index0    - 0-based index #}
{# loop.first     - true if first iteration #}
{# loop.last      - true if last iteration #}
{# loop.length    - total number of items #}

{# Loop with else (empty state) #}
{% for entity in output.entities %}
  <EntityBadge>{{ entity.text }}</EntityBadge>
{% else %}
  <Text color="muted">No entities tagged yet</Text>
{% endfor %}
```

**Includes (Reusable Partials):**

```html
{# layouts/partials/entity-legend.njk #}
<Section direction="row" gap="sm">
  {% for et in config.entity_types %}
    <Badge color="{{ et.color }}">{{ et.hotkey }}: {{ et.name }}</Badge>
  {% endfor %}
</Section>

{# Main layout #}
<Layout id="ner-layout">
  {% include "partials/entity-legend.njk" %}
  
  <NERTagger source="{{ input.text }}" value="{{ output.entities }}">
    ...
  </NERTagger>
</Layout>
```

**Macros (Reusable Components):**

```html
{# Define a macro #}
{% macro questionField(question, index) %}
  <Section direction="column" gap="sm">
    <Label>{{ index + 1 }}. {{ question.text }}</Label>
    {% if question.type == "text" %}
      <TextArea value="{{ output.answers[question.id] }}" />
    {% elif question.type == "choice" %}
      <RadioGroup value="{{ output.answers[question.id] }}">
        {% for opt in question.options %}
          <Radio value="{{ opt.value }}">{{ opt.label }}</Radio>
        {% endfor %}
      </RadioGroup>
    {% endif %}
  </Section>
{% endmacro %}

{# Use the macro #}
{% for q in input.questions %}
  {{ questionField(q, loop.index0) }}
{% endfor %}
```

#### 5.3.3 Filters

Nunjucks provides many built-in filters:

```html
{# String filters #}
{{ name | capitalize }}              {# "john" → "John" #}
{{ name | upper }}                   {# "john" → "JOHN" #}
{{ name | lower }}                   {# "JOHN" → "john" #}
{{ text | truncate(100) }}           {# Truncate to 100 chars #}
{{ text | trim }}                    {# Remove whitespace #}
{{ text | replace("a", "b") }}       {# Replace substring #}

{# Array filters #}
{{ items | length }}                 {# Array length #}
{{ items | first }}                  {# First element #}
{{ items | last }}                   {# Last element #}
{{ items | join(", ") }}             {# Join array #}
{{ items | sort }}                   {# Sort array #}
{{ items | reverse }}                {# Reverse array #}

{# Default values #}
{{ title | default("Untitled") }}    {# Default if undefined #}

{# JSON (custom filter) #}
{{ config.entity_types | json }}     {# Serialize to JSON string #}

{# Safe HTML (custom filter) #}
{{ input.html_content | safe }}      {# Render as HTML #}
```

**Custom Filters (defined by platform):**

```typescript
// packages/layout-runtime/src/filters.ts
env.addFilter('json', (obj) => JSON.stringify(obj));
env.addFilter('safe', (str) => new nunjucks.runtime.SafeString(str));
env.addFilter('formatDate', (date, format) => dayjs(date).format(format));
env.addFilter('pluralize', (count, singular, plural) => 
  count === 1 ? singular : (plural || singular + 's')
);
```

#### 5.3.4 Layout Components

All Tier 1 components are available as HTML-like tags:

```html
{# Layout primitives #}
<Section direction="row|column" gap="sm|md|lg" align="start|center|end">
<Grid columns="2|3|4" gap="md">
<Box flex="1" padding="md">

{# Typography #}
<Header level="1|2|3|4">Title</Header>
<Text size="sm|md|lg" color="default|muted|error">Content</Text>
<Label required>Field Label</Label>

{# Display components #}
<TextDisplay source="{{ input.text }}" />
<ImageViewer src="{{ input.image_url }}" zoom="true" />
<PDFViewer src="{{ input.pdf_url }}" page="{{ context.current_page }}" />
<AudioPlayer src="{{ input.audio_url }}" />

{# Annotation components #}
<NERTagger source="{{ input.text }}" value="{{ output.entities }}">
<Classification value="{{ output.label }}" options="{{ config.labels | json }}" />
<BoundingBox src="{{ input.image_url }}" value="{{ output.boxes }}" />
<Relation entities="{{ output.entities }}" value="{{ output.relations }}" />

{# Form inputs #}
<TextArea value="{{ output.notes }}" label="Notes" rows="3" />
<Select value="{{ output.choice }}" label="Select one" required>
<Checkbox value="{{ output.confirmed }}" label="I confirm this is correct" />
<RadioGroup value="{{ output.option }}">

{# Feedback components #}
<Alert variant="info|warning|error">Message</Alert>
<AISuggestions suggestions="{{ context.ai_suggestions }}" />
<PreviousAnnotations data="{{ context.previous }}" />
```

#### 5.3.5 Event Handlers

```html
{# Built-in handlers #}
<Button onClick="submit">Submit</Button>
<Button onClick="skip">Skip Task</Button>
<Button onClick="saveDraft">Save Draft</Button>

{# Custom handlers (defined in layout config) #}
<AISuggestions 
  suggestions="{{ context.ai_suggestions }}"
  onAccept="acceptSuggestion"
  onReject="rejectSuggestion"
/>

<NERTagger
  source="{{ input.text }}"
  value="{{ output.entities }}"
  onEntityAdd="trackEntityAdded"
/>
```

**Built-in Handlers:**

| Handler | Description |
|---------|-------------|
| `submit` | Submit annotation, advance to next task |
| `skip` | Skip current task |
| `saveDraft` | Save progress without submitting |
| `undo` | Undo last change |
| `redo` | Redo undone change |
| `reset` | Reset to initial state |

---

### 5.4 Template Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Template Processing Pipeline                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  .njk Template                 .mdx Template              .tsx Component    │
│       │                             │                          │            │
│       ▼                             ▼                          ▼            │
│  ┌──────────┐                 ┌──────────┐               ┌──────────┐      │
│  │ Nunjucks │                 │   MDX    │               │   TSC    │      │
│  │ Compile  │                 │ Compile  │               │ Compile  │      │
│  └────┬─────┘                 └────┬─────┘               └────┬─────┘      │
│       │                            │                          │            │
│       ▼                            ▼                          │            │
│  HTML String                  React Component                 │            │
│       │                            │                          │            │
│       ▼                            │                          │            │
│  ┌──────────┐                      │                          │            │
│  │  Parse   │                      │                          │            │
│  │   HTML   │                      │                          │            │
│  └────┬─────┘                      │                          │            │
│       │                            │                          │            │
│       ▼                            ▼                          ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                     React Renderer                               │       │
│  │              (with registered Tier 1 components)                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Nunjucks → React Runtime:**

```typescript
// packages/layout-runtime/src/nunjucks-renderer.tsx
import nunjucks from 'nunjucks';
import { parseDocument } from 'htmlparser2';
import { createElement, Fragment, useMemo, useCallback } from 'react';
import * as Components from '@annotation/components';

// Configure Nunjucks environment
const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader('layouts/'),
  { autoescape: true, throwOnUndefined: true }
);

// Add custom filters
env.addFilter('json', (obj) => JSON.stringify(obj));
env.addFilter('safe', (str) => new nunjucks.runtime.SafeString(str));

interface LayoutContext {
  input: Record<string, any>;
  output: Record<string, any>;
  context: Record<string, any>;
  config: Record<string, any>;
  user: { id: string; name: string; };
  task: { id: string; };
}

interface NunjucksLayoutProps {
  template: string;
  data: LayoutContext;
  onChange: (output: any) => void;
  onEvent: (event: string, payload: any) => void;
}

export function NunjucksLayout({ template, data, onChange, onEvent }: NunjucksLayoutProps) {
  // 1. Render Nunjucks template to HTML string
  const html = useMemo(() => {
    try {
      return env.renderString(template, data);
    } catch (err) {
      console.error('Template render error:', err);
      return `<Alert variant="error">Template error: ${err.message}</Alert>`;
    }
  }, [template, data]);
  
  // 2. Parse HTML to AST
  const ast = useMemo(() => parseDocument(html), [html]);
  
  // 3. Create change handler for output bindings
  const handleChange = useCallback((path: string, value: any) => {
    const newOutput = setPath({ ...data.output }, path, value);
    onChange(newOutput);
  }, [data.output, onChange]);
  
  // 4. Convert AST to React elements
  return useMemo(() => 
    astToReact(ast, data, handleChange, onEvent),
    [ast, data, handleChange, onEvent]
  );
}

function astToReact(
  node: any,
  data: LayoutContext,
  onChange: (path: string, value: any) => void,
  onEvent: (event: string, payload: any) => void
): React.ReactNode {
  // Handle text nodes
  if (node.type === 'text') {
    const text = node.data.trim();
    return text || null;
  }
  
  // Handle element nodes
  if (node.type === 'tag') {
    const componentName = pascalCase(node.name);
    const Component = Components[componentName];
    
    if (!Component) {
      console.warn(`Unknown component: ${componentName}`);
      return null;
    }
    
    // Parse attributes into props
    const props: Record<string, any> = {};
    
    for (const [attrName, attrValue] of Object.entries(node.attribs || {})) {
      const value = attrValue as string;
      
      // Handle output binding: value="{{ output.entities }}"
      if (attrName === 'value' && value.includes('output.')) {
        const path = extractOutputPath(value);
        props.value = getPath(data.output, path);
        props.onChange = (newValue: any) => onChange(path, newValue);
      }
      // Handle input binding: source="{{ input.text }}"
      else if (value.includes('input.')) {
        props[attrName] = getPath(data.input, extractPath(value, 'input.'));
      }
      // Handle context binding: suggestions="{{ context.ai_suggestions }}"
      else if (value.includes('context.')) {
        props[attrName] = getPath(data.context, extractPath(value, 'context.'));
      }
      // Handle config binding: options="{{ config.labels | json }}"
      else if (value.includes('config.')) {
        props[attrName] = getPath(data.config, extractPath(value, 'config.'));
      }
      // Handle event handlers: onClick="submit"
      else if (attrName.startsWith('on') && !value.includes('{{')) {
        props[attrName] = () => onEvent(value, {});
      }
      // Parse other values (numbers, booleans, strings)
      else {
        props[attrName] = parseAttributeValue(value);
      }
    }
    
    // Recursively render children
    const children = (node.children || [])
      .map((child: any, i: number) => 
        <Fragment key={i}>{astToReact(child, data, onChange, onEvent)}</Fragment>
      )
      .filter(Boolean);
    
    return createElement(Component, props, children.length > 0 ? children : undefined);
  }
  
  // Handle root/document nodes
  if (node.type === 'root' || node.type === 'document') {
    const children = (node.children || [])
      .map((child: any, i: number) => 
        <Fragment key={i}>{astToReact(child, data, onChange, onEvent)}</Fragment>
      )
      .filter(Boolean);
    return createElement(Fragment, null, children);
  }
  
  return null;
}

// Helper functions
function pascalCase(str: string): string {
  return str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function extractOutputPath(value: string): string {
  const match = value.match(/output\.([a-zA-Z0-9_.[\]]+)/);
  return match ? match[1] : '';
}

function extractPath(value: string, prefix: string): string {
  const match = value.match(new RegExp(`${prefix}([a-zA-Z0-9_.\\[\\]]+)`));
  return match ? match[1] : '';
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setPath(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
  return obj;
}

function parseAttributeValue(value: string): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}
```

**Layout Loader:**

```typescript
// packages/layout-runtime/src/layout-loader.ts
import { readFile } from 'fs/promises';
import { join } from 'path';

interface LayoutBundle {
  id: string;
  format: 'nunjucks' | 'mdx' | 'tsx';
  template: string;
  config: Record<string, any>;
  schema: {
    input: ZodSchema;
    output: ZodSchema;
  };
}

export async function loadLayout(layoutId: string): Promise<LayoutBundle> {
  const layoutDir = join(LAYOUTS_DIR, layoutId);
  
  // Determine format by checking which file exists
  const format = await detectFormat(layoutDir);
  
  // Load template
  const templateFile = format === 'nunjucks' ? 'template.njk' 
                     : format === 'mdx' ? 'template.mdx' 
                     : 'template.tsx';
  const template = await readFile(join(layoutDir, templateFile), 'utf-8');
  
  // Load config
  const configPath = join(layoutDir, 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  
  // Load schema
  const schemaPath = join(layoutDir, 'schema.json');
  const schemaJson = JSON.parse(await readFile(schemaPath, 'utf-8'));
  const schema = {
    input: jsonSchemaToZod(schemaJson.input),
    output: jsonSchemaToZod(schemaJson.output),
  };
  
  return { id: layoutId, format, template, config, schema };
}
```

**React Integration:**

```typescript
// packages/layout-runtime/src/AnnotationLayout.tsx
import { useState, useCallback } from 'react';
import { NunjucksLayout } from './nunjucks-renderer';
import { MDXLayout } from './mdx-renderer';
import { validateOutput } from './validation';

interface AnnotationLayoutProps {
  layout: LayoutBundle;
  task: Task;
  onSubmit: (output: any) => void;
  onSkip: () => void;
}

export function AnnotationLayout({ layout, task, onSubmit, onSkip }: AnnotationLayoutProps) {
  const [output, setOutput] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Build context for template
  const context: LayoutContext = {
    input: task.input,
    output,
    context: {
      ai_suggestions: task.aiSuggestions || [],
      previous_annotations: task.previousAnnotations || [],
    },
    config: layout.config,
    user: getCurrentUser(),
    task: { id: task.id },
  };
  
  // Handle output changes
  const handleChange = useCallback((newOutput: any) => {
    setOutput(newOutput);
    // Validate on change
    const validation = validateOutput(newOutput, layout.schema.output);
    setErrors(validation.errors);
  }, [layout.schema]);
  
  // Handle events (submit, skip, etc.)
  const handleEvent = useCallback((event: string, payload: any) => {
    switch (event) {
      case 'submit':
        const validation = validateOutput(output, layout.schema.output);
        if (validation.valid) {
          onSubmit(output);
        } else {
          setErrors(validation.errors);
        }
        break;
      case 'skip':
        onSkip();
        break;
      case 'saveDraft':
        saveDraft(task.id, output);
        break;
      // Custom handlers from layout config
      default:
        if (layout.config.handlers?.[event]) {
          // Execute custom handler logic
        }
    }
  }, [output, layout, task, onSubmit, onSkip]);
  
  // Render based on format
  if (layout.format === 'nunjucks') {
    return (
      <NunjucksLayout
        template={layout.template}
        data={context}
        onChange={handleChange}
        onEvent={handleEvent}
      />
    );
  }
  
  if (layout.format === 'mdx') {
    return (
      <MDXLayout
        source={layout.template}
        data={context}
        onChange={handleChange}
        onEvent={handleEvent}
      />
    );
  }
  
  // TSX layouts are pre-compiled
  const TSXComponent = layout.component;
  return (
    <TSXComponent
      {...context}
      onChange={handleChange}
      onEvent={handleEvent}
    />
  );
}
```

---

### 5.5 Layout Validation

```
LayoutSchema
├── input: ZodSchema                        # Expected input structure
├── output: ZodSchema                       # Required output structure
├── validation_rules: ValidationRule[]      # Custom validation rules
└── completion_requirements: CompletionRequirement[]  # What must be filled to submit
```

```
ValidationRule
├── rule_id: string
├── field_path: string              # JSONPath to field
├── type: enum(required, format, range, custom)
├── params: object                  # Rule-specific parameters
├── message: string                 # Error message on failure
└── severity: enum(error, warning)
```

```
CompletionRequirement
├── field: string                   # Field path
├── rule: enum(required, non_empty, min_length, custom)
└── params: object                  # Rule-specific parameters
```

**Example Schema:**

```typescript
// Defined alongside layout
export const ClinicalNERSchema = {
  input: z.object({
    document_text: z.string().min(1),
    document_id: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
  
  output: z.object({
    entities: z.array(z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
      type: z.string(),
      text: z.string(),
    })),
    confidence: z.enum(['high', 'medium', 'low']),
    notes: z.string().optional(),
  }),
  
  completionRequirements: [
    { field: 'entities', rule: 'required' },
    { field: 'confidence', rule: 'required' },
  ],
};
```

---

### 5.6 Layout Inheritance & Versioning

```
LayoutVersion
├── layout_id: UUID
├── version: int
├── template_source: string        # .njk, .mdx, or .tsx content
├── config: LayoutConfig
├── schema_hash: string
├── created_at: timestamp
├── created_by: UUID
├── change_notes: string
└── status: enum(draft, published, deprecated)
```

**Version Rules:**
1. Published layouts are immutable
2. New versions require migration path if schema changes
3. Projects reference specific layout versions
4. Deprecated layouts show warning but continue working

**Inheritance via Includes and Macros:**

Nunjucks supports template inheritance natively:

```html
{# layouts/base/annotation-base.njk #}
<Layout id="{{ config.id }}">
  <Section direction="column" gap="lg">
    
    {# Header slot #}
    {% block header %}
      <Header level="3">{{ config.title | default("Annotation Task") }}</Header>
    {% endblock %}
    
    {# Instructions slot #}
    {% block instructions %}{% endblock %}
    
    {# Main content slot #}
    {% block content %}{% endblock %}
    
    {# Metadata/form slot #}
    {% block metadata %}
      <Section direction="row" gap="md">
        {% if config.show_confidence %}
          <Select value="{{ output.confidence }}" label="Confidence" required>
            <Option value="high">High</Option>
            <Option value="medium">Medium</Option>
            <Option value="low">Low</Option>
          </Select>
        {% endif %}
        {% if config.show_notes %}
          <TextArea value="{{ output.notes }}" label="Notes" />
        {% endif %}
      </Section>
    {% endblock %}
    
  </Section>
</Layout>
```

```html
{# layouts/clinical-ner-v1/template.njk #}
{% extends "base/annotation-base.njk" %}

{% block instructions %}
  <Alert variant="info">
    Tag all medical entities in the document below.
    Use keyboard shortcuts: {% for et in config.entity_types %}{{ et.hotkey }}={{ et.name }}{{ ", " if not loop.last }}{% endfor %}
  </Alert>
{% endblock %}

{% block content %}
  <TextDisplay source="{{ input.document_text }}" />
  
  {% if context.ai_suggestions | length > 0 %}
    <AISuggestions suggestions="{{ context.ai_suggestions }}" />
  {% endif %}
  
  <NERTagger source="{{ input.document_text }}" value="{{ output.entities }}">
    {% for et in config.entity_types %}
      <EntityType name="{{ et.name }}" color="{{ et.color }}" hotkey="{{ et.hotkey }}" />
    {% endfor %}
  </NERTagger>
{% endblock %}
```

**Reusable Macros Library:**

```html
{# layouts/macros/common.njk #}

{% macro confidenceSelect(value, required=true) %}
  <Select value="{{ value }}" label="Confidence" required="{{ required }}">
    <Option value="high">High - Very confident</Option>
    <Option value="medium">Medium - Some uncertainty</Option>
    <Option value="low">Low - Significant uncertainty</Option>
  </Select>
{% endmacro %}

{% macro entityLegend(entityTypes) %}
  <Section direction="row" gap="sm" wrap="wrap">
    {% for et in entityTypes %}
      <Badge color="{{ et.color }}">
        {% if et.hotkey %}{{ et.hotkey }}: {% endif %}{{ et.name }}
      </Badge>
    {% endfor %}
  </Section>
{% endmacro %}

{% macro aiSuggestionsPanel(suggestions) %}
  {% if suggestions | length > 0 %}
    <Card variant="outlined">
      <Header level="4">AI Suggestions ({{ suggestions | length }})</Header>
      <AISuggestions 
        suggestions="{{ suggestions | json }}"
        onAccept="acceptSuggestion"
        onReject="rejectSuggestion"
      />
    </Card>
  {% endif %}
{% endmacro %}
```

```html
{# Use macros in layouts #}
{% import "macros/common.njk" as common %}

<Layout id="my-layout">
  {{ common.entityLegend(config.entity_types) }}
  
  <NERTagger source="{{ input.text }}" value="{{ output.entities }}">
    ...
  </NERTagger>
  
  {{ common.aiSuggestionsPanel(context.ai_suggestions) }}
  {{ common.confidenceSelect("{{ output.confidence }}") }}
</Layout>
```

---

## 6. Task Management

> **Section Summary:** This section defines the core runtime models for tracking individual units of work: Task (with 8-state lifecycle from pending to completed/failed/cancelled, workflow state, and input/output data), WorkflowState and StepState (tracking current position and per-step progress), TaskAssignment (linking users to tasks for specific steps with 6-state lifecycle), and Annotation (the labeled data with 5-state lifecycle, versioning, and complete audit trail via AuditEntry and FieldChange for compliance tracking).

### 6.1 Task Model

```
Task
├── task_id: UUID
├── project_id: UUID
├── project_type_id: UUID
├── status: enum(pending, assigned, in_progress, review, adjudication, completed, failed, cancelled)
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

```
AuditEntry
├── entry_id: UUID
├── timestamp: timestamp
├── actor_id: UUID                  # User or system that made change
├── actor_type: enum(user, system, api)
├── action: enum(created, updated, submitted, approved, rejected, reverted)
├── changes: FieldChange[]          # What fields changed
├── reason: string                  # Optional reason for change
└── metadata: object                # Additional context
```

```
FieldChange
├── field_path: string              # JSONPath to changed field
├── old_value: any
├── new_value: any
└── change_type: enum(added, modified, removed)
```

---

## 7. Quality Management

> **Section Summary:** This section defines the quality measurement and enforcement system, including QualityScore model for tasks/users/projects with confidence intervals, task-level quality with conflict resolution, user-level quality profiles with per-metric trends. It provides a comprehensive evaluation configuration system with 13+ built-in evaluators (agreement metrics like Krippendorff's alpha, IoU, accuracy against gold standards, consistency checks, speed/throughput), custom evaluator plugins via TypeScript SDK, configurable aggregation methods, evaluation scheduling (on-submit, periodic, manual), and quality-based actions (alerts, assignment restrictions, auto-approve rules) triggered by threshold/trend conditions.

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

> **Section Summary:** This section defines the PostgreSQL-based persistence layer with five design principles (write-optimized, read-optimized for exports, flexible JSONB schema, full audit trail, scalable to billions). It covers the complete SQL schema with 21 enum types and partitioned tables (tasks, annotations by project_id hash), event sourcing via annotation_events with monthly partitions, materialized views for analytics, comprehensive instrumentation for interaction events (keystrokes, selections, field changes) with real-time pipeline architecture, training data export schema for ML, storage architecture with Redis coordination, background services for metrics aggregation and exports, streaming export API, data warehouse integration, and data lifecycle management with hot/warm/cold storage tiers.

### 7A.1 Storage Design Principles

1. **Write-optimized for annotation capture**: High throughput for concurrent annotators
2. **Read-optimized for exports**: Efficient batch retrieval for ML pipelines
3. **Flexible schema**: Support varying annotation structures across project types
4. **Full audit trail**: Immutable history for compliance
5. **Scalable**: Handle billions of annotations across thousands of projects

### 7A.2 Data Model

#### 7A.2.1 Core Annotation Storage

```sql
-- Enum types (must be created before tables that use them)
CREATE TYPE annotation_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'superseded');
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'review', 'adjudication', 'completed', 'failed', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'in_progress', 'submitted', 'expired', 'reassigned');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE step_type AS ENUM ('annotation', 'review', 'adjudication', 'auto_process', 'conditional', 'sub_workflow');
CREATE TYPE step_status AS ENUM ('pending', 'active', 'completed', 'skipped');
CREATE TYPE actor_type AS ENUM ('user', 'system', 'api');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE goal_type AS ENUM ('volume', 'quality', 'deadline', 'duration', 'composite', 'manual');
CREATE TYPE quality_entity_type AS ENUM ('task', 'annotation', 'user', 'project');

-- Workflow Configuration Enums (§4 Workflow Engine)
CREATE TYPE workflow_type AS ENUM ('single', 'multi_vote', 'multi_adjudication', 'custom');
CREATE TYPE completion_criteria_type AS ENUM ('annotation_count', 'review_decision', 'auto', 'manual');
CREATE TYPE consensus_method AS ENUM ('majority_vote', 'weighted_vote', 'unanimous');
CREATE TYPE resolution_strategy AS ENUM ('majority_vote', 'weighted_vote', 'adjudication', 'additional_annotators', 'escalate');
CREATE TYPE assignment_mode AS ENUM ('auto', 'manual', 'pool');
CREATE TYPE load_balancing_strategy AS ENUM ('round_robin', 'least_loaded', 'quality_weighted');
CREATE TYPE contribution_type AS ENUM ('count', 'quality_metric', 'progress');
CREATE TYPE aggregation_type AS ENUM ('sum', 'latest', 'average', 'min', 'max');
CREATE TYPE transition_condition_type AS ENUM ('always', 'on_complete', 'on_agreement', 'on_disagreement', 'expression');
CREATE TYPE timeout_action AS ENUM ('proceed', 'retry', 'escalate');

-- Users table (referenced by annotations and assignments)
CREATE TABLE users (
    user_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    display_name        VARCHAR(255) NOT NULL,
    status              user_status NOT NULL DEFAULT 'active',
    skills              JSONB DEFAULT '[]',
    roles               JSONB DEFAULT '[]',
    quality_profile     JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Quality scores table (stores quality metrics for tasks, users, projects)
CREATE TABLE quality_scores (
    score_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         quality_entity_type NOT NULL,
    entity_id           UUID NOT NULL,
    score_type          VARCHAR(50) NOT NULL,  -- 'agreement', 'accuracy', 'consistency', etc.
    value               FLOAT NOT NULL,
    confidence          FLOAT,
    sample_size         INT NOT NULL DEFAULT 1,
    evaluator_id        VARCHAR(100),  -- Which evaluator calculated this
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculation_metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_score CHECK (value >= 0 AND value <= 1),
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX idx_quality_scores_entity ON quality_scores(entity_type, entity_id);
CREATE INDEX idx_quality_scores_type ON quality_scores(score_type, calculated_at DESC);

-- Tasks table (partitioned by project)
CREATE TABLE tasks (
    task_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL,
    project_type_id     UUID NOT NULL,
    status              task_status NOT NULL DEFAULT 'pending',
    priority            INT NOT NULL DEFAULT 0,
    input_data          JSONB NOT NULL,
    workflow_state      JSONB NOT NULL DEFAULT '{}',
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    
    CONSTRAINT valid_priority CHECK (priority >= -100 AND priority <= 100)
) PARTITION BY HASH (project_id);

-- Create task partitions
CREATE TABLE tasks_p0 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE tasks_p1 PARTITION OF tasks FOR VALUES WITH (MODULUS 16, REMAINDER 1);
-- ... (partitions 2-15)

-- Task assignments table
CREATE TABLE task_assignments (
    assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES tasks(task_id),
    step_id             UUID NOT NULL,
    user_id             UUID NOT NULL,
    status              assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,
    time_spent_ms       BIGINT,
    assignment_metadata JSONB DEFAULT '{}',
    
    CONSTRAINT unique_user_task_step UNIQUE (task_id, step_id, user_id)
);

CREATE INDEX idx_assignments_user_status ON task_assignments(user_id, status);
CREATE INDEX idx_assignments_task ON task_assignments(task_id);

-- Partitioned by project for query isolation and maintenance
CREATE TABLE annotations (
    annotation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES tasks(task_id),
    step_id             UUID NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(user_id),
    assignment_id       UUID NOT NULL REFERENCES task_assignments(assignment_id),
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

### 7A.2.4 Instrumentation & Exhaust Data Collection

Comprehensive data collection for productivity analytics, quality improvement, and ML training data generation.

#### 7A.2.4.1 Interaction Events (Fine-Grained Telemetry)

```sql
-- High-volume interaction events (stored in TimescaleDB or ClickHouse for scale)
CREATE TABLE interaction_events (
    event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL,              -- Browser session
    assignment_id       UUID NOT NULL,              -- Links to task_assignment
    user_id             UUID NOT NULL,
    
    -- Event classification
    event_type          VARCHAR(50) NOT NULL,       -- See enum below
    event_category      VARCHAR(30) NOT NULL,       -- input, navigation, annotation, system
    
    -- Timing (millisecond precision)
    client_timestamp    TIMESTAMPTZ NOT NULL,       -- When event occurred on client
    server_timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_since_session_start_ms  BIGINT NOT NULL,   -- Relative timing for replay
    
    -- Event-specific payload
    payload             JSONB NOT NULL,             -- Event details (see below)
    
    -- Context for reconstruction
    dom_snapshot_id     UUID,                       -- Optional: reference to DOM state
    annotation_state_hash VARCHAR(64),              -- Hash of annotation state at event time
    
    -- Indexing
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

-- Event types enum (for reference, stored as VARCHAR for flexibility)
-- Input events:      keystroke, paste, cut, undo, redo
-- Mouse events:      click, double_click, right_click, drag_start, drag_end, scroll
-- Selection events:  text_select, entity_select, span_create, span_delete, span_modify
-- Navigation events: focus, blur, tab_switch, scroll_to_element
-- Annotation events: field_change, label_apply, label_remove, relation_create, relation_delete
-- System events:     auto_save, validation_error, hint_shown, shortcut_used
```

**Event Payload Examples:**

```json
// keystroke event
{
  "event_type": "keystroke",
  "payload": {
    "key": "a",
    "modifiers": ["shift"],
    "target_field": "entity_text",
    "cursor_position": 145,
    "text_before": "The patient presented with",
    "text_after": "The patient presented withA"
  }
}

// span_create event (NER annotation)
{
  "event_type": "span_create",
  "payload": {
    "span_id": "temp_001",
    "start_offset": 45,
    "end_offset": 58,
    "text": "hypertension",
    "label": "CONDITION",
    "method": "keyboard_shortcut",  // vs "click_drag", "suggestion_accept"
    "time_to_label_ms": 234         // Time from selection to label assignment
  }
}

// field_change event
{
  "event_type": "field_change",
  "payload": {
    "field_path": "$.classification.severity",
    "old_value": "moderate",
    "new_value": "severe",
    "change_method": "dropdown_select",  // vs "keyboard", "autocomplete"
    "options_viewed": ["mild", "moderate", "severe"],
    "time_in_dropdown_ms": 1200
  }
}
```

#### 7A.2.4.2 Session & Step Aggregates

```sql
-- Aggregated metrics per assignment (step-level)
CREATE TABLE assignment_metrics (
    assignment_id       UUID PRIMARY KEY REFERENCES task_assignments(assignment_id),
    user_id             UUID NOT NULL,
    task_id             UUID NOT NULL,
    step_id             UUID NOT NULL,
    
    -- Timing breakdown
    total_time_ms       BIGINT NOT NULL,            -- Wall clock time
    active_time_ms      BIGINT NOT NULL,            -- Excluding idle (>30s gaps)
    idle_time_ms        BIGINT NOT NULL,            -- Gaps > 30 seconds
    focus_time_ms       BIGINT NOT NULL,            -- Tab in focus
    
    -- Activity metrics
    total_interactions  INT NOT NULL,               -- Total events
    keystrokes          INT NOT NULL,
    clicks              INT NOT NULL,
    selections          INT NOT NULL,
    scroll_events       INT NOT NULL,
    
    -- Annotation-specific
    entities_created    INT DEFAULT 0,
    entities_deleted    INT DEFAULT 0,
    entities_modified   INT DEFAULT 0,
    relations_created   INT DEFAULT 0,
    fields_changed      INT DEFAULT 0,
    undo_count          INT DEFAULT 0,
    redo_count          INT DEFAULT 0,
    
    -- Corrections & revisions
    corrections_count   INT DEFAULT 0,              -- Changes after initial annotation
    revision_cycles     INT DEFAULT 0,              -- Times user revisited completed fields
    
    -- Quality signals
    validation_errors   INT DEFAULT 0,
    hints_viewed        INT DEFAULT 0,
    guidelines_accessed INT DEFAULT 0,
    
    -- Efficiency metrics
    actions_per_minute  DECIMAL(8,2),
    avg_time_per_entity_ms BIGINT,
    
    -- Computed at write time
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflow-level aggregates (per task across all steps)
CREATE TABLE workflow_execution_metrics (
    task_id             UUID PRIMARY KEY,
    workflow_id         UUID NOT NULL,
    
    -- Per-step breakdown (JSONB array)
    step_metrics        JSONB NOT NULL,  -- [{step_id, user_id, time_ms, actions, ...}, ...]
    
    -- Workflow totals
    total_time_ms       BIGINT NOT NULL,
    total_active_time_ms BIGINT NOT NULL,
    total_participants  INT NOT NULL,
    
    -- Quality trajectory
    quality_by_step     JSONB,           -- [{step_id, quality_score, agreement}, ...]
    final_quality_score DECIMAL(5,4),
    
    -- Rework metrics
    rejections          INT DEFAULT 0,
    escalations         INT DEFAULT 0,
    reassignments       INT DEFAULT 0,
    
    completed_at        TIMESTAMPTZ
);
```

#### 7A.2.4.3 Training Data Export Schema

For ML model training, we export comprehensive input→action→output traces:

```sql
-- Training data export view (materialized for performance)
CREATE MATERIALIZED VIEW mv_training_data_export AS
SELECT
    -- Identifiers (anonymized for export)
    a.annotation_id,
    a.task_id,
    encode(sha256(a.user_id::text::bytea), 'hex') AS user_hash,  -- Anonymized
    
    -- Input context
    t.input_data AS task_input,
    t.metadata AS task_metadata,
    ws.config AS workflow_step_config,
    l.template AS layout_template,
    
    -- Output
    a.data AS annotation_output,
    a.quality_score,
    
    -- Interaction trace (sampled for large tasks)
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'ts', time_since_session_start_ms,
                'type', event_type,
                'payload', payload
            ) ORDER BY client_timestamp
        )
        FROM interaction_events ie
        WHERE ie.assignment_id = ta.assignment_id
        -- Sample: keep all annotation events, sample others at 10%
        AND (event_category = 'annotation' OR random() < 0.1)
    ) AS interaction_trace,
    
    -- Aggregated metrics
    am.total_time_ms,
    am.active_time_ms,
    am.actions_per_minute,
    am.corrections_count,
    am.undo_count,
    
    -- Revision history
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'ts', occurred_at,
                'type', event_type,
                'changes', changes,
                'snapshot', data_snapshot
            ) ORDER BY occurred_at
        )
        FROM annotation_events ae
        WHERE ae.annotation_id = a.annotation_id
    ) AS revision_history,
    
    -- Context: what came before in workflow
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'step_id', prev_a.step_id,
                'data', prev_a.data
            )
        )
        FROM annotations prev_a
        WHERE prev_a.task_id = a.task_id 
          AND prev_a.created_at < a.created_at
          AND prev_a.status = 'submitted'
    ) AS prior_step_outputs
    
FROM annotations a
JOIN tasks t ON a.task_id = t.task_id
JOIN task_assignments ta ON a.assignment_id = ta.assignment_id
JOIN workflow_steps ws ON a.step_id = ws.step_id
JOIN layouts l ON ws.layout_id = l.layout_id
LEFT JOIN assignment_metrics am ON ta.assignment_id = am.assignment_id
WHERE a.status IN ('submitted', 'approved')
  AND a.submitted_at > NOW() - INTERVAL '90 days';  -- Rolling window
```

#### 7A.2.4.4 Real-Time Instrumentation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Instrumentation Pipeline                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Browser  │───▶│  WebSocket  │───▶│   Event      │───▶│  ClickHouse/ │   │
│  │  Client  │    │   Gateway   │    │   Router     │    │  TimescaleDB │   │
│  └──────────┘    └─────────────┘    └──────┬───────┘    └──────────────┘   │
│       │                                     │                               │
│       │ Batch every 5s                      │ Real-time                     │
│       │ or 100 events                       ▼                               │
│       │                            ┌──────────────┐                         │
│       │                            │    Redis     │                         │
│       │                            │  (Pub/Sub)   │                         │
│       │                            └──────┬───────┘                         │
│       │                                   │                                 │
│       ▼                                   ▼                                 │
│  ┌──────────┐                     ┌──────────────┐    ┌──────────────┐     │
│  │  Local   │                     │  Aggregation │───▶│  PostgreSQL  │     │
│  │ Storage  │                     │   Service    │    │  (metrics)   │     │
│  │(IndexedDB)│                    └──────────────┘    └──────────────┘     │
│  └──────────┘                                                              │
│       │                                                                     │
│       └── Offline support: sync when reconnected                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Client-Side Collection (TypeScript):**

```typescript
interface InstrumentationConfig {
  // Sampling rates (0.0 - 1.0)
  keystrokeSampleRate: number;     // 1.0 = capture all keystrokes
  scrollSampleRate: number;        // 0.1 = sample 10% of scroll events
  mousemoveSampleRate: number;     // 0.01 = sample 1% of mouse moves
  
  // Batching
  batchSize: number;               // Events per batch (default: 100)
  batchIntervalMs: number;         // Max time between sends (default: 5000)
  
  // Privacy
  excludeFields: string[];         // ['password', 'ssn', 'credit_card']
  hashPII: boolean;                // Hash personally identifiable text
  
  // Storage
  maxLocalStorageEvents: number;   // IndexedDB limit for offline (default: 10000)
}

class InstrumentationService {
  private eventBuffer: InteractionEvent[] = [];
  private sessionId: string;
  private sessionStartTime: number;
  private lastAnnotationStateHash: string;
  
  recordEvent(event: Omit<InteractionEvent, 'session_id' | 'time_since_session_start_ms'>) {
    const enrichedEvent: InteractionEvent = {
      ...event,
      session_id: this.sessionId,
      time_since_session_start_ms: Date.now() - this.sessionStartTime,
      annotation_state_hash: this.lastAnnotationStateHash,
    };
    
    this.eventBuffer.push(enrichedEvent);
    
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  // Specialized recorders for common events
  recordKeystroke(key: string, modifiers: string[], targetField: string, cursorPos: number): void;
  recordSpanCreate(span: Span, method: 'keyboard' | 'mouse' | 'suggestion'): void;
  recordFieldChange(path: string, oldVal: any, newVal: any, method: string): void;
  recordUndo(): void;
  recordRedo(): void;
  
  // Compute session metrics on completion
  computeSessionMetrics(): AssignmentMetrics;
}
```

#### 7A.2.4.5 Training Data Export Pipeline

The export pipeline is **orchestrator-agnostic** — it exposes a standard interface that any DAG tool can invoke.

**Pipeline Steps (Orchestrator-Independent):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Training Data Export Pipeline                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1              Step 2              Step 3              Step 4         │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐     │
│  │ Refresh  │──────▶│  Export  │──────▶│  Upload  │──────▶│ Register │     │
│  │  Views   │       │ to File  │       │ to Store │       │ Catalog  │     │
│  └──────────┘       └──────────┘       └──────────┘       └──────────┘     │
│       │                  │                  │                  │            │
│       ▼                  ▼                  ▼                  ▼            │
│   POST /api/         POST /api/         POST /api/         POST /api/      │
│   export/refresh     export/run         export/upload      export/catalog  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Export API (REST endpoints for any orchestrator):**

```yaml
# Platform exposes these endpoints for orchestration
export_api:
  base_url: /api/v1/export
  
  endpoints:
    # Step 1: Refresh materialized views
    - path: /refresh-views
      method: POST
      params:
        views: [mv_training_data_export, mv_user_quality_summary]
      returns: { status, rows_affected, duration_ms }
    
    # Step 2: Export to file format
    - path: /run
      method: POST
      params:
        format: parquet | jsonl | tfrecord | huggingface
        partitions: [project_id, date]
        compression: snappy | gzip | zstd
        date_range: { start, end }
        project_ids: []  # optional filter
      returns: { export_id, file_paths[], row_count, size_bytes }
    
    # Step 3: Upload to storage
    - path: /upload
      method: POST
      params:
        export_id: uuid
        destination:
          type: s3 | gcs | azure | local
          bucket: string
          prefix: string
      returns: { urls[], etags[] }
    
    # Step 4: Register in catalog
    - path: /catalog
      method: POST
      params:
        export_id: uuid
        catalog_type: glue | iceberg | delta | unity | custom
        table_name: string
      returns: { catalog_entry_id, table_version }
    
    # Convenience: Run full pipeline
    - path: /pipeline
      method: POST
      params:
        # All params from above steps
      returns: { pipeline_run_id, steps_completed[], final_urls[] }

  # Webhook callback for async completion
  webhooks:
    on_complete: POST {callback_url} with { export_id, status, urls[] }
    on_error: POST {callback_url} with { export_id, error, step_failed }
```

**Orchestrator Integrations:**

| Orchestrator | Integration Method | Configuration |
|--------------|-------------------|---------------|
| **Airflow** (default) | PythonOperator calling REST API | DAG template provided |
| **Databricks** | Notebook/Job calling REST API | Notebook template provided |
| **Prefect** | @task decorators calling REST API | Flow template provided |
| **Dagster** | @op / @asset calling REST API | Asset template provided |
| **Custom/In-house** | Direct curl/HTTP calls | Shell script template |
| **Cron + Script** | Bash script with curl | Minimal dependency |

**Example: Airflow DAG (Default)**

```python
# dags/training_data_export.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import requests

EXPORT_API = "https://annotation-platform.internal/api/v1/export"

def refresh_views():
    resp = requests.post(f"{EXPORT_API}/refresh-views", 
        json={"views": ["mv_training_data_export"]})
    resp.raise_for_status()
    return resp.json()

def export_data(**context):
    resp = requests.post(f"{EXPORT_API}/run", json={
        "format": "parquet",
        "partitions": ["project_id", "date"],
        "date_range": {"start": context["ds"], "end": context["ds"]}
    })
    resp.raise_for_status()
    return resp.json()["export_id"]

def upload_to_s3(**context):
    export_id = context["ti"].xcom_pull(task_ids="export_data")
    resp = requests.post(f"{EXPORT_API}/upload", json={
        "export_id": export_id,
        "destination": {"type": "s3", "bucket": "ml-training-data", "prefix": f"exhaust/{context['ds']}/"}
    })
    resp.raise_for_status()

with DAG("training_data_export", schedule="0 2 * * *", start_date=datetime(2025, 1, 1)):
    t1 = PythonOperator(task_id="refresh_views", python_callable=refresh_views)
    t2 = PythonOperator(task_id="export_data", python_callable=export_data)
    t3 = PythonOperator(task_id="upload_to_s3", python_callable=upload_to_s3)
    t1 >> t2 >> t3
```

**Example: Databricks Notebook**

```python
# Databricks notebook: training_data_export
import requests

EXPORT_API = dbutils.secrets.get("annotation-platform", "export_api_url")
API_KEY = dbutils.secrets.get("annotation-platform", "api_key")
headers = {"Authorization": f"Bearer {API_KEY}"}

# Step 1: Refresh
requests.post(f"{EXPORT_API}/refresh-views", headers=headers, 
    json={"views": ["mv_training_data_export"]}).raise_for_status()

# Step 2: Export
export_resp = requests.post(f"{EXPORT_API}/run", headers=headers, json={
    "format": "parquet",
    "partitions": ["project_id", "date"]
}).json()

# Step 3: Upload to Unity Catalog location
requests.post(f"{EXPORT_API}/upload", headers=headers, json={
    "export_id": export_resp["export_id"],
    "destination": {"type": "azure", "container": "ml-data", "prefix": "annotation-exhaust/"}
}).raise_for_status()

# Step 4: Register in Unity Catalog
requests.post(f"{EXPORT_API}/catalog", headers=headers, json={
    "export_id": export_resp["export_id"],
    "catalog_type": "unity",
    "table_name": "ml_catalog.training.annotation_exhaust"
}).raise_for_status()
```

**Example: Custom/Curl (Minimal Dependencies)**

```bash
#!/bin/bash
# export_training_data.sh - Run via cron or any scheduler

set -euo pipefail
EXPORT_API="${EXPORT_API_URL:-http://localhost:8080/api/v1/export}"
AUTH_HEADER="Authorization: Bearer ${EXPORT_API_KEY}"
DATE=$(date +%Y-%m-%d)

echo "Step 1: Refreshing views..."
curl -sf -X POST "$EXPORT_API/refresh-views" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"views": ["mv_training_data_export"]}'

echo "Step 2: Exporting data..."
EXPORT_ID=$(curl -sf -X POST "$EXPORT_API/run" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"format\": \"parquet\", \"partitions\": [\"project_id\", \"date\"]}" \
  | jq -r '.export_id')

echo "Step 3: Uploading to S3..."
curl -sf -X POST "$EXPORT_API/upload" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"export_id\": \"$EXPORT_ID\", \"destination\": {\"type\": \"s3\", \"bucket\": \"ml-training-data\", \"prefix\": \"exhaust/$DATE/\"}}"

echo "Export complete: $EXPORT_ID"
```

**Export Formats:**

| Format | Use Case | Size |
|--------|----------|------|
| Parquet | ML training pipelines (Spark, PyTorch) | Compressed, columnar |
| JSONL | Streaming, LLM fine-tuning | Line-delimited JSON |
| TFRecord | TensorFlow training | Optimized for TF |
| HuggingFace Dataset | Transformers fine-tuning | Arrow format |

#### 7A.2.4.6 Privacy & Compliance

```yaml
data_retention:
  interaction_events:
    hot_storage: 30 days      # ClickHouse/TimescaleDB
    warm_storage: 90 days     # Compressed Parquet in S3
    cold_storage: 1 year      # Glacier
    deletion: after 1 year    # GDPR compliance
  
  training_exports:
    retention: 2 years        # Model reproducibility
    anonymization: required   # No raw user IDs
    
anonymization_rules:
  - field: user_id
    method: sha256_hash
    salt: per_export_rotating
  - field: ip_address
    method: drop
  - field: user_agent
    method: generalize        # "Chrome/Windows" not full string
  - field: free_text_fields
    method: pii_redaction     # NER-based PII detection
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

> **Section Summary:** This section defines the UI for monitoring and managing annotation work. It starts with the Workflow Interaction UI (§8.0): interactive DAG visualization of workflow steps with progress bars, access-controlled step boxes showing lock states and assignment counts, annotator click behavior (task assignment flow), admin click behavior (task list management with filtering/bulk actions), evict/reassign dialogs, task state machine, and real-time WebSocket updates. The Dashboard Views (§8.1) cover user dashboards (quality/volume metrics, trends), team dashboards (leaderboards, workload distribution, SLA compliance), project dashboards (completion progress, bottlenecks, adjudication summary), and executive rollup views with hierarchical aggregation from task→user→team→project→organization.

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

> **Note:** The following UI component examples use pseudocode with reactive binding notation (`bind:`, `:prop=`) to describe behavior. These are **platform internal UI components** (built in React/TypeScript), not annotation layouts (which use Nunjucks templates).

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

> **Section Summary:** This section defines the plugin system for customization without core code changes. It covers the HookRegistry architecture with four hook types: workflow hooks (lifecycle and transition events), step hooks (preProcess for AI prefill/data enrichment, postProcess for validation/external API calls, validation hooks), UI hooks (AI assist, field-level interactions, real-time suggestions), and interactive layout hooks (live code lookup, dependent field updates). Configuration is YAML-based, and a library of 9 built-in hooks covers common patterns like AI prefill, external API calls, ML inference, and notifications.

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

> **Section Summary:** This section defines external system connectivity through a comprehensive REST API covering users, teams, projects, tasks, annotations, workflows, layouts, hooks, reports, and components with standard CRUD operations plus specialized endpoints (quality metrics, dashboards, export). It includes an event system with 10 core events (task.created, annotation.submitted, workflow.completed, etc.) for real-time notifications, and webhook configuration with retry policies and signature verification for external system integration.

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

> **Section Summary:** This section covers authentication (SSO via SAML 2.0/OIDC, API keys, JWT sessions, MFA), authorization (RBAC from §2, resource-level permissions, API scopes), comprehensive audit logging with actor/action/resource/IP tracking, data protection (AES-256 at rest, TLS 1.3 in transit, PII field-level encryption, retention policies, right to deletion), and compliance features for HIPAA-compatible audit trails, data lineage, access logging, and audit exports.

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

> **Section Summary:** This section specifies system targets for performance (task assignment <100ms, layout rendering <500ms, annotation submission <200ms, dashboard load <2s, 10,000+ concurrent users), scalability (horizontal API scaling, queue-based distribution, partitioned storage, CDN), availability (99.9% uptime SLA, graceful degradation, multi-region option, automated failover), and observability (structured logging, distributed tracing, metrics collection, alerting integration).

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

> **Section Summary:** This section provides implementation details for the platform. It specifies the technology stack (Rust/Axum backend, PostgreSQL, Redis for coordination, NATS message bus, React/TypeScript frontend, WASM/Deno plugin runtimes). The backend architecture (§13.2) includes complete Cargo.toml dependencies, project structure with crates for api/domain/plugins/infrastructure/shared, and all shared types with `#[typeshare]` for TypeScript generation (User, Task, Annotation, QualityScore, all status enums including the 10 workflow configuration enums). The frontend architecture (§13.3) covers package.json dependencies and project structure. The plugin system (§13.4) defines WIT interfaces for WASM interop, WASM and JavaScript plugin runtimes with sandboxing, the TypeScript Plugin SDK, example plugins (WASM AI prefill, JS external validation), frontend plugin loader, security model with capability-based permissions, and plugin configuration.

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
pub struct UserSkill {
    pub skill_id: Uuid,
    pub name: String,
    pub proficiency_level: ProficiencyLevel,
    pub certified_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProficiencyLevel {
    Novice,
    Intermediate,
    Advanced,
    Expert,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Annotator,
    Reviewer,
    Adjudicator,
    TeamLead,
    TeamManager,
    ProjectAdmin,
    SystemAdmin,
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
#[serde(rename_all = "snake_case")]
pub enum ProjectStatus {
    Draft,
    Active,
    Paused,
    Completed,
    Archived,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GoalType {
    Volume,
    Quality,
    Deadline,
    Duration,
    Composite,
    Manual,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Assigned,
    InProgress,
    Review,
    Adjudication,
    Completed,
    Failed,
    Cancelled,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnnotationStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Superseded,
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
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Task with expanded relations (for API responses)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskWithRelations {
    #[serde(flatten)]
    pub task: Task,
    pub assignments: Vec<TaskAssignment>,
    pub annotations: Vec<Annotation>,
    pub quality_scores: Vec<QualityScore>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskAssignment {
    pub id: Uuid,
    pub task_id: Uuid,
    pub step_id: Uuid,
    pub user_id: Uuid,
    pub status: AssignmentStatus,
    pub assigned_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub time_spent_ms: Option<i64>,
    pub assignment_metadata: serde_json::Value,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentStatus {
    Assigned,
    Accepted,
    InProgress,
    Submitted,
    Expired,
    Reassigned,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    pub id: Uuid,
    pub task_id: Uuid,
    pub step_id: Uuid,
    pub user_id: Uuid,
    pub assignment_id: Uuid,
    pub data: serde_json::Value,
    pub status: AnnotationStatus,
    pub submitted_at: Option<DateTime<Utc>>,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Annotation with expanded audit trail (for detailed views)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationWithAudit {
    #[serde(flatten)]
    pub annotation: Annotation,
    pub audit_trail: Vec<AuditEntry>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub actor_id: Uuid,
    pub actor_type: ActorType,
    pub action: AuditAction,
    pub changes: Vec<FieldChange>,
    pub reason: Option<String>,
    pub metadata: serde_json::Value,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorType {
    User,
    System,
    Api,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Created,
    Updated,
    Submitted,
    Approved,
    Rejected,
    Reverted,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldChange {
    pub field_path: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub change_type: ChangeType,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    Added,
    Modified,
    Removed,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityScore {
    pub id: Uuid,
    pub entity_type: QualityEntityType,
    pub entity_id: Uuid,
    pub score_type: String,
    pub value: f64,
    pub confidence: Option<f64>,
    pub sample_size: i32,
    pub evaluated_at: DateTime<Utc>,
    pub evaluator_id: Option<String>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityEntityType {
    Task,
    Annotation,
    User,
    Project,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowState {
    pub current_step_id: Uuid,
    pub step_states: std::collections::HashMap<Uuid, StepState>,
    pub context: serde_json::Value,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepState {
    pub status: StepStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub attempts: i32,
    pub output: Option<serde_json::Value>,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Active,
    Completed,
    Skipped,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepType {
    Annotation,
    Review,
    Adjudication,
    AutoProcess,
    Conditional,
    SubWorkflow,
}

// Workflow Configuration Enums (§4 Workflow Engine)

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowType {
    Single,
    MultiVote,
    MultiAdjudication,
    Custom,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompletionCriteriaType {
    AnnotationCount,
    ReviewDecision,
    Auto,
    Manual,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConsensusMethod {
    MajorityVote,
    WeightedVote,
    Unanimous,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResolutionStrategy {
    MajorityVote,
    WeightedVote,
    Adjudication,
    AdditionalAnnotators,
    Escalate,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentMode {
    Auto,
    Manual,
    Pool,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastLoaded,
    QualityWeighted,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContributionType {
    Count,
    QualityMetric,
    Progress,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AggregationType {
    Sum,
    Latest,
    Average,
    Min,
    Max,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransitionConditionType {
    Always,
    OnComplete,
    OnAgreement,
    OnDisagreement,
    Expression,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimeoutAction {
    Proceed,
    Retry,
    Escalate,
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
        status: task-status,
        priority: s32,
        input-data: string,  // JSON
        metadata: string,    // JSON
    }
    
    enum task-status {
        pending,
        assigned,
        in-progress,
        review,
        adjudication,
        completed,
        failed,
        cancelled,
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
        superseded,
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

// ============================================================================
// Status Enums (must match §6 canonical definitions)
// ============================================================================

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'review' | 'adjudication' | 'completed' | 'failed' | 'cancelled';
export type AnnotationStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
export type AssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'submitted' | 'expired' | 'reassigned';
export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped';
export type StepType = 'annotation' | 'review' | 'adjudication' | 'auto_process' | 'conditional' | 'sub_workflow';
export type ActorType = 'user' | 'system' | 'api';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type GoalType = 'volume' | 'quality' | 'deadline' | 'duration' | 'composite' | 'manual';

// Workflow Configuration Enums (§4 Workflow Engine)
export type WorkflowType = 'single' | 'multi_vote' | 'multi_adjudication' | 'custom';
export type CompletionCriteriaType = 'annotation_count' | 'review_decision' | 'auto' | 'manual';
export type ConsensusMethod = 'majority_vote' | 'weighted_vote' | 'unanimous';
export type ResolutionStrategy = 'majority_vote' | 'weighted_vote' | 'adjudication' | 'additional_annotators' | 'escalate';
export type AssignmentMode = 'auto' | 'manual' | 'pool';
export type LoadBalancingStrategy = 'round_robin' | 'least_loaded' | 'quality_weighted';
export type ContributionType = 'count' | 'quality_metric' | 'progress';
export type AggregationType = 'sum' | 'latest' | 'average' | 'min' | 'max';
export type TransitionConditionType = 'always' | 'on_complete' | 'on_agreement' | 'on_disagreement' | 'expression';
export type TimeoutAction = 'proceed' | 'retry' | 'escalate';

// ============================================================================
// Core Models (must match §6 canonical definitions)
// ============================================================================

export interface Task {
  id: string;
  projectId: string;
  projectTypeId: string;
  status: TaskStatus;
  priority: number;
  inputData: Record<string, unknown>;
  workflowState: WorkflowState;
  metadata: Record<string, unknown>;
  createdAt: string;  // ISO timestamp
  completedAt?: string;
}

export interface TaskWithRelations extends Task {
  assignments: TaskAssignment[];
  annotations: Annotation[];
  qualityScores: QualityScore[];
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  stepId: string;
  userId: string;
  status: AssignmentStatus;
  assignedAt: string;
  acceptedAt?: string;
  submittedAt?: string;
  timeSpentMs?: number;
  assignmentMetadata: Record<string, unknown>;
}

export interface Annotation {
  id: string;
  taskId: string;
  stepId: string;
  userId: string;
  assignmentId: string;
  data: Record<string, unknown>;
  status: AnnotationStatus;
  submittedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationWithAudit extends Annotation {
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorType: ActorType;
  action: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'reverted';
  changes: FieldChange[];
  reason?: string;
  metadata: Record<string, unknown>;
}

export interface FieldChange {
  fieldPath: string;
  oldValue?: unknown;
  newValue?: unknown;
  changeType: 'added' | 'modified' | 'removed';
}

export interface WorkflowState {
  currentStepId: string;
  stepStates: Record<string, StepState>;
  context: Record<string, unknown>;
}

export interface StepState {
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  output?: Record<string, unknown>;
}

export interface QualityScore {
  id: string;
  entityType: 'task' | 'annotation' | 'user' | 'project';
  entityId: string;
  scoreType: string;
  value: number;
  confidence?: number;
  sampleSize: number;
  evaluatedAt: string;
  evaluatorId?: string;
}

// ============================================================================
// Plugin Context Types
// ============================================================================

export interface StepContext {
  stepId: string;
  stepName: string;
  stepType: StepType;
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

> **Section Summary:** Defines key domain terms used throughout the document: Annotation, Adjudication, Layout, Project Type, Skill, Workflow, Hook, and Gold Standard.

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

> **Section Summary:** Provides five complete, production-ready configuration examples: B.1 Medical Coding Workflow (multi-annotation with consensus, volume/quality/deadline/composite goals, AI prefill hooks), B.2 Continuous Labeling Project (volume + deadline goals, quality-weighted load balancing), B.3 Quality-Driven NER Project (sustained quality goal, manual signoff, consensus config), B.4 NER Annotation Layout (complete Nunjucks template with entity types, confidence selector, JSON schema), and B.5 Quality Evaluator Configuration (Krippendorff's alpha, medical coding accuracy, completeness evaluators with threshold rules).

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

```html
{# layouts/clinical-ner-v1.njk #}
{# Clinical NER Layout - Nunjucks Template #}

<Layout id="clinical-ner-v1">
  
  {# Task metadata header #}
  <Section direction="row" justify="between" padding="sm" background="subtle">
    <Text variant="mono" size="sm">{{ input.document_id }}</Text>
    <Badge variant="{{ input.priority }}">{{ input.priority | capitalize }}</Badge>
  </Section>
  
  {# Main content area #}
  <Section direction="column" gap="lg" padding="md" flex="1">
    
    {# Document display #}
    <Panel title="Source Document" collapsible="false">
      <TextDisplay 
        source="{{ input.document_text }}"
        format="plain"
        highlightRanges="{{ context.ai_highlights | json }}"
        font="reading"
      />
    </Panel>
    
    {# NER annotation #}
    <Panel title="Entity Annotation" flex="1">
      <NERTagger
        source="{{ input.document_text }}"
        value="{{ output.entities }}"
        allowOverlapping="false"
        showEntityCount="true"
      >
        {% for et in config.entity_types %}
          <EntityType 
            name="{{ et.name }}" 
            color="{{ et.color }}" 
            hotkey="{{ et.hotkey }}"
          >
            {% if et.description %}
              <Description>{{ et.description }}</Description>
            {% endif %}
            {% if et.examples %}
              <Examples>{{ et.examples }}</Examples>
            {% endif %}
          </EntityType>
        {% endfor %}
      </NERTagger>
      
      {# AI suggestions panel #}
      {% if context.ai_predictions | length > 0 %}
        <Divider margin="md" />
        <AIAssistPanel 
          predictions="{{ context.ai_predictions | json }}"
          onAccept="acceptPrediction"
          onReject="rejectPrediction"
          title="AI Suggestions"
        />
      {% endif %}
    </Panel>
    
  </Section>
  
  {# Bottom metadata #}
  <Section direction="row" gap="md" padding="md">
    <Select
      value="{{ output.confidence }}"
      label="Confidence"
      required
      flex="1"
    >
      <Option value="high">High</Option>
      <Option value="medium">Medium</Option>
      <Option value="low">Low</Option>
    </Select>
    
    <Select
      value="{{ output.document_quality }}"
      label="Document Quality"
      flex="1"
    >
      <Option value="good">Good - Clear and complete</Option>
      <Option value="fair">Fair - Some issues but usable</Option>
      <Option value="poor">Poor - Significant problems</Option>
    </Select>
    
    <TextArea
      value="{{ output.notes }}"
      label="Notes (optional)"
      placeholder="Any issues or observations..."
      rows="2"
      flex="2"
    />
  </Section>
  
  {# Validation messages #}
  {% if validation.errors | length > 0 %}
    <Alert variant="error" margin="md">
      {% for error in validation.errors %}
        <Text>{{ error.message }}</Text>
      {% endfor %}
    </Alert>
  {% endif %}
  
</Layout>
```

**Layout Config (clinical-ner-v1.json):**

```json
{
  "id": "clinical-ner-v1",
  "name": "Clinical NER Layout",
  "version": 1,
  "config": {
    "entity_types": [
      {
        "name": "Diagnosis",
        "color": "#FF6B6B",
        "hotkey": "d",
        "description": "Medical diagnoses and conditions",
        "examples": "diabetes, hypertension, pneumonia"
      },
      {
        "name": "Medication",
        "color": "#4ECDC4",
        "hotkey": "m",
        "description": "Drug names and dosages",
        "examples": "metformin 500mg, lisinopril"
      },
      {
        "name": "Procedure",
        "color": "#45B7D1",
        "hotkey": "p",
        "description": "Medical procedures and tests",
        "examples": "MRI, blood panel, appendectomy"
      },
      {
        "name": "Anatomy",
        "color": "#96CEB4",
        "hotkey": "a",
        "description": "Body parts and anatomical structures",
        "examples": "left ventricle, femur, lungs"
      }
    ]
  },
  "schema": {
    "input": {
      "type": "object",
      "properties": {
        "document_id": { "type": "string" },
        "document_text": { "type": "string" },
        "priority": { "type": "string", "enum": ["low", "normal", "high"] }
      },
      "required": ["document_id", "document_text"]
    },
    "output": {
      "type": "object",
      "properties": {
        "entities": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "type": { "type": "string" },
              "text": { "type": "string" }
            }
          }
        },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
        "document_quality": { "type": "string", "enum": ["good", "fair", "poor"] },
        "notes": { "type": "string" }
      },
      "required": ["entities", "confidence"]
    }
  }
}
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
