# PRD Quick Reference Guide & Cheatsheet

This document provides a quick reference to understand the Data Annotation Platform PRD structure, key concepts, and cross-references.

---

## Document Structure Overview

| Section | Lines | Purpose |
|---------|-------|---------|
| **Executive Summary** | L3-327 | High-level overview of all features, core models, status enums |
| **§1 Overview** | L327-341 | Purpose and design principles |
| **§2 User & Team Management** | L341-523 | Users, skills, roles, teams, RBAC |
| **§3 Project & Project Type** | L523-609 | Projects, project types, data sources |
| **§4 Workflow Engine** | L609-1261 | Workflows, steps, goals, transitions |
| **§5 Layout & Component System** | L1261-2880 | Three-tier architecture, Nunjucks templates, components |
| **§6 Task Management** | L2880-2974 | Tasks, workflow state, assignments, annotations |
| **§7 Quality Management** | L2974-3440 | Quality scores, evaluators, rules |
| **§7A Annotation Storage** | L3440-4865 | PostgreSQL schema, storage architecture, exports |
| **§8 Dashboard & Reporting** | L4865-5362 | UI components, dashboards, reports |
| **§9 Extensibility & Hooks** | L5362-5579 | Hook system, plugin points |
| **§10 Integration & API** | L5579-5683 | REST API, events, webhooks |
| **§11 Security & Compliance** | L5683-5729 | Auth, audit, encryption |
| **§12 Non-Functional Requirements** | L5729-5758 | Performance, scalability, availability |
| **§13 Technical Architecture** | L5758-7258 | Rust backend, React frontend, plugin system |
| **Appendix A** | L7513+ | Glossary |
| **Appendix B** | L7530+ | Example configurations |

---

## Section Summaries

| Section | Summary |
|---------|---------|
| **Executive Summary** | High-level roadmap covering the 5-phase data lifecycle, all 14 feature sections, cross-reference validation matrix, and canonical enum definitions |
| **§1 Overview** | Platform purpose and five key design principles (configuration over code, extensibility, quality-first, scalability, auditability) |
| **§2 User & Team** | Users with skills (novice→expert), seven hierarchical roles, RBAC permissions, Teams with leaders/managers, assignment rules, quality profiles |
| **§3 Project & Type** | Projects (5-state lifecycle), ProjectTypes (templates with JSON schemas), DataSourceConfig, QualityCriteria |
| **§4 Workflow** | Four workflow types, six step types, ConsensusConfig, nested workflows, six goal types, Rust evaluation engine, transitions, duplicate prevention |
| **§5 Layout** | Three-tier architecture (React components → Nunjucks layouts → ML services), Layout model, template processing pipeline, validation, inheritance |
| **§6 Task** | Task (8-state lifecycle), WorkflowState/StepState, TaskAssignment (6-state), Annotation (5-state), AuditEntry/FieldChange |
| **§7 Quality** | QualityScore model, 13+ built-in evaluators, custom plugins via TypeScript SDK, aggregation, scheduling, quality-based action rules |
| **§7A Storage** | PostgreSQL with 21 enum types, partitioned tables, event sourcing, materialized views, instrumentation pipeline, export API, data lifecycle |
| **§8 Dashboard** | Workflow DAG visualization, step access control, annotator/admin click behaviors, real-time WebSocket updates, dashboard views |
| **§9 Hooks** | HookRegistry with workflow/step/UI/interactive hooks, YAML configuration, nine built-in hooks |
| **§10 API** | REST API for all resources, 10 core events, webhook configuration |
| **§11 Security** | SSO (SAML/OIDC), RBAC, audit logging, encryption (AES-256/TLS 1.3), HIPAA compliance features |
| **§12 NFR** | Performance (<100ms assignment), scalability (10K+ users), availability (99.9%), observability |
| **§13 Tech** | Rust/Axum backend, React frontend, WASM/Deno plugin runtimes, WIT interfaces, TypeScript Plugin SDK |
| **Appendix A** | Glossary of 8 key domain terms |
| **Appendix B** | Five complete configuration examples (medical coding, continuous labeling, NER, layout, quality config) |

---

## Core Concepts Quick Reference

### 1. Entity Hierarchy

```
Organization
└── Teams
    └── Users (with Skills, Roles)

Project
└── ProjectType (template)
    └── Workflow
        └── WorkflowSteps
            └── Tasks
                └── TaskAssignments
                    └── Annotations
```

### 2. Status Enumerations (Canonical - §Executive Summary)

| Enum | Values | Section |
|------|--------|---------|
| `user_status` | active, inactive, suspended | §2.1 |
| `task_status` | pending, assigned, in_progress, review, adjudication, completed, failed, cancelled | §6.1 |
| `annotation_status` | draft, submitted, approved, rejected, superseded | §6.4 |
| `assignment_status` | assigned, accepted, in_progress, submitted, expired, reassigned | §6.3 |
| `step_status` | pending, active, completed, skipped | §6.2 |
| `step_type` | annotation, review, adjudication, auto_process, conditional, sub_workflow | §4.3 |
| `project_status` | draft, active, paused, completed, archived | §3.1 |
| `goal_type` | volume, quality, deadline, duration, composite, manual | §4.4 |
| `actor_type` | user, system, api | §6.4 |
| `layout_format` | nunjucks, mdx, tsx | §5.2 |

**Workflow Configuration Enums (§4):** *(All have SQL, Rust, and TypeScript implementations)*

| Enum | Values | SQL Type | Rust Type | TS Type |
|------|--------|----------|-----------|---------|
| `workflow_type` | single, multi_vote, multi_adjudication, custom | `workflow_type` | `WorkflowType` | `WorkflowType` |
| `completion_criteria_type` | annotation_count, review_decision, auto, manual | `completion_criteria_type` | `CompletionCriteriaType` | `CompletionCriteriaType` |
| `consensus_method` | majority_vote, weighted_vote, unanimous | `consensus_method` | `ConsensusMethod` | `ConsensusMethod` |
| `resolution_strategy` | majority_vote, weighted_vote, adjudication, additional_annotators, escalate | `resolution_strategy` | `ResolutionStrategy` | `ResolutionStrategy` |
| `assignment_mode` | auto, manual, pool | `assignment_mode` | `AssignmentMode` | `AssignmentMode` |
| `load_balancing` | round_robin, least_loaded, quality_weighted | `load_balancing_strategy` | `LoadBalancingStrategy` | `LoadBalancingStrategy` |
| `contribution_type` | count, quality_metric, progress | `contribution_type` | `ContributionType` | `ContributionType` |
| `aggregation` | sum, latest, average, min, max | `aggregation_type` | `AggregationType` | `AggregationType` |
| `transition_condition_type` | always, on_complete, on_agreement, on_disagreement, expression | `transition_condition_type` | `TransitionConditionType` | `TransitionConditionType` |
| `timeout_action` | proceed, retry, escalate | `timeout_action` | `TimeoutAction` | `TimeoutAction` |
| `proficiency_level` | novice, intermediate, advanced, expert | — | `ProficiencyLevel` | — |

### 3. Core Models Location Reference

| Model | Canonical Definition | SQL Schema | Rust Types | TypeScript Types |
|-------|---------------------|------------|------------|------------------|
| User | §2.1 | §7A.2.1 | §13.2.3 | §13.4.5 |
| Team | §2.2 | - | - | - |
| Project | §3.1 | - | - | - |
| ProjectType | §3.2 | - | - | - |
| Workflow | §4.1 | - | - | - |
| WorkflowStep | §4.3 | - | - | - |
| ConsensusConfig | §4.2.2 | - | - | - |
| ProjectGoal | §4.4 | - | - | - |
| Layout | §5.2 | - | - | - |
| Task | §6.1 | §7A.2.1 | §13.2.3 | §13.4.5 |
| TaskAssignment | §6.3 | §7A.2.1 | §13.2.3 | §13.4.5 |
| Annotation | §6.4 | §7A.2.1 | §13.2.3 | §13.4.5 |
| QualityScore | §7.1 | §7A.2.1 | §13.2.3 | §13.4.5 |
| WorkflowState | §6.2 | - | §13.2.3 | §13.4.5 |
| StepState | §6.2 | - | §13.2.3 | §13.4.5 |
| AuditEntry | §6.4 | §7A.2.2 | §13.2.3 | §13.4.5 |

---

## Workflow System Quick Reference

### Workflow Types (§4.2)

| Type | Description | Use Case |
|------|-------------|----------|
| `single` | One annotator per task | Simple labeling |
| `multi_vote` | Multiple annotators, consensus needed | Quality-critical tasks |
| `multi_adjudication` | Multiple + expert review | High-stakes annotation |
| `custom` | Arbitrary DAG | Complex workflows |

### Step Types (§4.3)

| Type | Description | Requires Layout | Assignment |
|------|-------------|-----------------|------------|
| `annotation` | Human annotates | Yes | Yes |
| `review` | Human reviews/approves | Yes | Yes |
| `adjudication` | Expert resolves conflicts | Yes | Yes |
| `auto_process` | System processing | No | No |
| `conditional` | Branching logic | No | No |
| `sub_workflow` | Nested workflow | No (inherits) | Inherited |

### Goal Types (§4.4)

| Type | Config Fields | Tracks |
|------|--------------|--------|
| `volume` | Target, Unit, CountingRule | Task/annotation count |
| `quality` | Metric, Threshold, MinSampleSize | Quality metrics |
| `deadline` | Deadline, Warnings, OnDeadline | Time-based completion |
| `duration` | Duration, StartFrom | Relative time from start |
| `composite` | Operator (and/or), Goals[] | Combines other goals |
| `manual` | AuthorizedRoles, Checklist | Human signoff |

### Step Completion vs Goal Contribution (§4.3.1-4.3.2)

- **StepCompletionCriteria**: When can THIS TASK move to next step?
  - `annotation_count`: N annotators needed
  - `review_decision`: Single reviewer decides
  - `auto`: Processing completes
  - `manual`: Admin intervention

- **GoalContributions**: How does this step contribute to PROJECT GOALS?
  - `count`: Adds to volume goal
  - `quality_metric`: Reports quality measurement
  - `progress`: Reports completion progress

---

## Layout System Quick Reference (§5)

### Three-Tier Architecture

| Tier | Who | What | Technology |
|------|-----|------|------------|
| 1 | Frontend team | Base components | TypeScript/React |
| 2 | All developers | Layouts | Nunjucks (HTML+Jinja) |
| 3 | Data science | ML services | Python/Rust |

### Nunjucks Template Variables

| Variable | Read/Write | Description |
|----------|------------|-------------|
| `{{ input.* }}` | Read | Task input data |
| `{{ output.* }}` | Read/Write | Annotation output (bound) |
| `{{ context.* }}` | Read | AI suggestions, previous annotations |
| `{{ config.* }}` | Read | Layout configuration |
| `{{ user.* }}` | Read | Current user info |
| `{{ task.* }}` | Read | Task metadata |

### Common Nunjucks Patterns

```html
{# Conditionals #}
{% if context.ai_suggestions | length > 0 %}...{% endif %}

{# Loops #}
{% for item in config.entity_types %}
  <EntityType name="{{ item.name }}" />
{% endfor %}

{# Filters #}
{{ name | capitalize }}
{{ items | length }}
{{ data | json }}

{# Macros #}
{% macro myComponent(arg) %}...{% endmacro %}
{{ myComponent("value") }}

{# Includes #}
{% include "partials/header.njk" %}
```

### Built-in Components (§5.3.4)

**Layout**: Section, Grid, Box, Header, Text, Label, Alert, Divider
**Input**: TextArea, TextInput, Select, Checkbox, RadioGroup, Button
**Annotation**: NERTagger, Classification, BoundingBox, Relation
**Display**: TextDisplay, ImageViewer, PDFViewer, AudioPlayer
**Control**: Show, ForEach, Switch

---

## Quality System Quick Reference (§7)

### Built-in Evaluators (§7.4.3)

| ID | Type | Measures |
|----|------|----------|
| `agreement:cohens_kappa` | agreement | 2-rater agreement |
| `agreement:fleiss_kappa` | agreement | Multi-rater agreement |
| `agreement:krippendorff_alpha` | agreement | Any number of raters |
| `agreement:iou` | agreement | Span/bounding box overlap |
| `accuracy:gold_standard` | accuracy | Comparison to gold labels |
| `accuracy:expert_review` | accuracy | Expert judgment |
| `completeness:required_fields` | completeness | Field presence |
| `completeness:coverage` | completeness | Data coverage |
| `time:duration` | efficiency | Time per task |
| `time:throughput` | efficiency | Tasks per hour |

### Quality Score Structure (§7.1)

```
QualityScore
├── entity_type: task | user | project
├── entity_id: UUID
├── score_type: string (evaluator ID)
├── value: float (0.0-1.0)
├── confidence: float
├── sample_size: int
└── evaluated_at: timestamp
```

---

## Storage Architecture Quick Reference (§7A)

### Key Tables

| Table | Purpose | Partitioning |
|-------|---------|--------------|
| `users` | User accounts | None |
| `tasks` | Task records | By project_id (hash) |
| `task_assignments` | User-task-step links | None |
| `annotations` | Annotation data | By project_id (hash) |
| `annotation_events` | Audit log | By time (range) |
| `interaction_events` | Fine-grained telemetry | By time (range) |
| `quality_scores` | Quality metrics | None |

### Architecture Principles

1. **PostgreSQL is source of truth** - All writes go directly to Postgres
2. **Redis for coordination only** - Sessions, locks, pub/sub, caching
3. **Background services** - Quality calculation, exports run separately
4. **Event-driven** - Events published after successful DB commits

---

## Plugin System Quick Reference (§13.4)

### Plugin Types

| Type | Runtime | Location | Use Case |
|------|---------|----------|----------|
| Backend Hook | WASM or JS | Server | Pre/post processing |
| UI Component | JS or WASM | Browser | Custom annotation |
| UI Hook | JS | Browser | AI assist, validation |
| Workflow Action | WASM or JS | Server | Custom steps |

### Hook Points (§9)

| Hook | Timing | Example Use |
|------|--------|-------------|
| `onWorkflowStart` | Workflow begins | Load ML context |
| `onWorkflowComplete` | Workflow ends | Trigger export |
| `preProcess` | Before step starts | AI prefill |
| `postProcess` | After step completes | External validation |
| `validate` | During annotation | Live validation |
| `aiAssist` | On user action | Suggestions |

---

## API Quick Reference (§10)

### Main Endpoints

```
/api/v1/
├── /users           # User management
├── /teams           # Team management
├── /projects        # Project CRUD
├── /tasks           # Task operations
├── /annotations     # Annotation CRUD
├── /workflows       # Workflow definitions
├── /layouts         # Layout management
├── /hooks           # Hook registration
├── /reports         # Reporting
└── /components      # Component registry
```

### Key Events (for webhooks)

- `task.created`, `task.assigned`, `task.completed`
- `annotation.submitted`, `annotation.approved`, `annotation.rejected`
- `workflow.step.completed`, `workflow.completed`
- `quality.threshold.breached`

---

## Technology Stack (§13.1)

| Layer | Technology |
|-------|------------|
| Backend | Rust + Axum |
| Database | PostgreSQL 15+ |
| Coordination | Redis 7+ |
| Message Bus | NATS |
| Search | Meilisearch |
| Frontend | React 18 + TypeScript 5 |
| Plugin Runtime | WASM (wasmtime) + JS (Deno) |
| Object Storage | S3-compatible |

---

## Common Patterns

### Creating a New Workflow

1. Define Steps (§4.3) with:
   - Type (annotation/review/etc)
   - Layout reference
   - CompletionCriteria
   - GoalContributions
   - Assignment config

2. Define Transitions (§4.5) with:
   - From/to step IDs
   - Conditions

3. Define Goals (§4.4) with:
   - Type (volume/quality/etc)
   - Target values
   - Measurement config

### Creating a New Layout

1. Write Nunjucks template (§5.3)
2. Create config.json with entity types
3. Create schema.json with input/output schemas
4. Register in layout registry

### Adding Quality Evaluation

1. Configure evaluators (§7.4.2)
2. Set aggregation method (§7.4.6)
3. Define quality rules (§7.4.8)
4. Set scheduling (§7.4.7)

---

## Cross-Reference Validation

When making changes, verify consistency across:

1. **Domain Model** (§2-§6) - Canonical field definitions
2. **SQL Schema** (§7A.2) - Database types match
3. **Rust Types** (§13.2.3) - `#[typeshare]` structs
4. **WIT Interfaces** (§13.4.2) - WASM plugin types
5. **TypeScript SDK** (§13.4.5) - Frontend/plugin types
6. **Status Enums** (Executive Summary) - All values align

---

## Quick Troubleshooting

| Issue | Check Section |
|-------|---------------|
| Task not progressing | §4.3.1 StepCompletionCriteria |
| Goal not tracking | §4.3.2 GoalContributions |
| User can't access step | §2.1.3 RBAC, §4.3.3 Assignment |
| Layout not rendering | §5.4 Template Processing |
| Quality not calculating | §7.4 Evaluator Config |
| Plugin not executing | §13.4 Plugin Runtime |
