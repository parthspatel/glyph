# Glyph v1.0 Requirements

> Derived from [Product Requirements](/docs/design/product-requirements.md)
> All requirements are **MUST HAVE** for v1.0 unless marked otherwise.

---

## REQ-INFRA: Infrastructure & DevOps

### REQ-INFRA-001: Repository Structure
Hybrid monorepo with apps/, libs/, packages/, infrastructure/ structure supporting parallel team development.

### REQ-INFRA-002: CI/CD Pipeline
GitHub Actions workflow with:
- Rust build + test + clippy
- TypeScript build + test + lint
- Docker image builds
- Helm chart validation
- Deployment to k3s (dev) and AKS (prod)

### REQ-INFRA-003: Kubernetes Deployment
Helm charts for all services:
- API server (Rust)
- Web frontend (static + nginx)
- Worker (background jobs)
- PostgreSQL (managed or operator)
- Redis (managed or operator)
- NATS

### REQ-INFRA-004: Terraform Infrastructure
AKS cluster provisioning with:
- Node pools (system, workload)
- Azure PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Blob Storage (S3-compatible)
- Azure Key Vault for secrets

### REQ-INFRA-005: Observability
- Structured logging (JSON)
- Metrics (Prometheus format)
- Tracing (OpenTelemetry)
- Health endpoints (/health, /ready)

---

## REQ-AUTH: Authentication & Authorization

### REQ-AUTH-001: JWT Authentication
Stateless JWT tokens with:
- Access token (short-lived, 15min)
- Refresh token (long-lived, 7d)
- Token rotation on refresh

### REQ-AUTH-002: Auth0 Integration
OAuth2/OIDC integration with Auth0:
- Social login support
- Enterprise SSO (SAML, OIDC)
- User provisioning via SCIM (optional)

### REQ-AUTH-003: RBAC System
Role-based access control with:
- 7 predefined roles (annotator → system_admin)
- Resource + action + scope permissions
- Team-scoped permission inheritance

### REQ-AUTH-004: Audit Logging
All operations logged with:
- Actor (user_id, actor_type)
- Action (CRUD, workflow transitions)
- Resource (type, id)
- Timestamp, IP, user agent

---

## REQ-USER: User & Team Management

### REQ-USER-001: User Model
User entity with:
- Identity (email, display_name)
- Status (active, inactive, suspended)
- Skills with proficiency levels
- Role assignments
- Team memberships

### REQ-USER-002: Skill System
Skills with:
- Proficiency levels (novice → expert)
- Certification tracking
- Expiration dates
- Skill-based assignment matching

### REQ-USER-003: Team Model
Teams with:
- Hierarchical structure (leader, manager, members)
- Capacity configuration
- Specializations (project types)
- Allocation percentages

### REQ-USER-004: Quality Profile
Per-user quality tracking:
- Overall score (0.0-1.0)
- Accuracy, consistency, agreement rate
- Per-skill quality breakdown
- Sample size and confidence

---

## REQ-PROJ: Project & Project Types

### REQ-PROJ-001: Project Model
Project entity with:
- Lifecycle (draft → active → paused → completed → archived)
- Associated workflow
- Project goals
- Data source configuration

### REQ-PROJ-002: Project Type Model
Reusable templates with:
- Task input schema (JSON Schema)
- Annotation output schema (JSON Schema)
- Skill requirements
- Default layout
- Quality criteria

### REQ-PROJ-003: Data Source Integration
Support for:
- API ingestion (webhook, polling)
- S3-compatible bucket import
- Manual upload (CSV, JSON)
- Batch and streaming modes

---

## REQ-WF: Workflow Engine

### REQ-WF-001: Workflow Types
Three workflow patterns:
- **Single**: 1 annotator → complete
- **Multi-Adjudication**: N annotators → consensus check → adjudication if disagreement
- **Custom**: Arbitrary DAG with conditional branching

### REQ-WF-002: Step Types
Six step types:
- annotation, review, adjudication
- auto_process, conditional, sub_workflow

### REQ-WF-003: Workflow State Machine
State management with:
- Current step tracking
- Per-step state (pending, active, completed, skipped)
- Context passing between steps
- Event sourcing for audit

### REQ-WF-004: Consensus & Agreement
Configurable consensus:
- Agreement metrics (Kappa, Alpha, IoU)
- Threshold-based decisions
- Resolution strategies (majority, weighted, adjudication, escalate)

### REQ-WF-005: Assignment Engine
Smart assignment with:
- Skill-based matching
- Load balancing (round-robin, least-loaded, quality-weighted)
- Duplicate prevention (same user can't annotate twice)
- Cross-step exclusion (annotator can't review own work)

### REQ-WF-006: Workflow YAML Configuration
Declarative workflow definition:
- Steps, transitions, hooks
- Validation on save
- Version tracking

### REQ-WF-007: Project Goals
Goal types:
- Volume (task count targets)
- Quality (metric thresholds)
- Deadline (time-based)
- Composite (AND/OR combinations)
- Manual (human sign-off)

### REQ-WF-008: Nested Workflows
Sub-workflow support:
- Entry/exit points
- Input/output mapping
- Context isolation
- Recursion limits

---

## REQ-TASK: Task Management

### REQ-TASK-001: Task Model
Task entity with:
- Input data (JSONB)
- Status lifecycle (8 states)
- Workflow state
- Priority
- Metadata

### REQ-TASK-002: Task Assignment
Assignment entity with:
- User + task + step binding
- Status lifecycle (6 states)
- Time tracking
- Accept/reject workflow

### REQ-TASK-003: Annotation Model
Annotation entity with:
- Data (JSONB, schema-validated)
- Status lifecycle (5 states)
- Versioning
- Audit trail

### REQ-TASK-004: Task Queue
Annotator-facing queue with:
- Filtering (project, status, priority)
- Sorting (deadline, assignment time)
- Pagination
- Real-time updates (WebSocket)

---

## REQ-LAYOUT: Layout & Component System

### REQ-LAYOUT-001: Nunjucks Templates
Template engine with:
- Data binding (input, output, context)
- Control flow (if, for, include, macro)
- Component rendering
- Security constraints (no arbitrary JS)

### REQ-LAYOUT-002: Base Components
Core annotation components:
- NERTagger, Classification, BoundingBox
- TextArea, Select, RadioGroup, Checkbox
- TextDisplay, ImageViewer, PDFViewer, AudioPlayer

### REQ-LAYOUT-003: Layout Schema
Input/output validation:
- JSON Schema for task input
- JSON Schema for annotation output
- Completion requirements

### REQ-LAYOUT-004: Layout Versioning
Version control:
- Immutable versions
- Migration support
- Rollback capability

---

## REQ-QUAL: Quality Management

### REQ-QUAL-001: Quality Scoring
Score model with:
- Entity type (task, annotation, user, project)
- Score value + confidence
- Sample size
- Evaluator reference

### REQ-QUAL-002: IAA Metrics
Built-in evaluators:
- Cohen's Kappa (pairwise)
- Krippendorff's Alpha (multi-rater)
- IoU for spans/boxes
- Exact match percentage

### REQ-QUAL-003: Gold Standard
Calibration system:
- Gold dataset management
- Blind gold insertion
- Accuracy tracking vs gold
- Partial credit scoring

### REQ-QUAL-004: Quality Actions
Automated responses:
- Auto-approval (high quality)
- Reassignment (low quality)
- Volume throttling
- Alert notifications

### REQ-QUAL-005: Quality Dashboard
Visibility into:
- Project quality trends
- Team quality comparison
- Individual annotator scores
- Drill-down capability

---

## REQ-STORE: Annotation Storage

### REQ-STORE-001: PostgreSQL Schema
Partitioned tables:
- By project_id for isolation
- JSONB for flexible annotation data
- Proper indexing

### REQ-STORE-002: Event Sourcing
Append-only event log:
- All annotation changes tracked
- Actor, timestamp, changes
- Replayable history

### REQ-STORE-003: Export System
Data extraction:
- Streaming export for large datasets
- Formats: JSON, JSONL, Parquet, CSV
- Filtering and transformation
- S3 upload destination

### REQ-STORE-004: Data Lifecycle
Retention management:
- Hot/warm/cold storage tiers
- Archival policies
- PII anonymization

---

## REQ-DASH: Dashboard & Reporting

### REQ-DASH-001: Annotator Dashboard
Personal view:
- My task queue
- My quality scores
- My productivity metrics
- Recent activity

### REQ-DASH-002: Team Dashboard
Team lead view:
- Team task distribution
- Team quality metrics
- Workload balancing
- Member performance

### REQ-DASH-003: Project Dashboard
Admin view:
- Goal progress tracking
- Quality trends
- Throughput metrics
- Export controls

### REQ-DASH-004: System Dashboard
System admin view:
- All projects overview
- System health
- User management
- Audit log viewer

---

## REQ-HOOK: Extensibility & Hooks

### REQ-HOOK-001: Workflow Hooks
Lifecycle hooks:
- on_workflow_start, on_workflow_complete
- on_step_start, on_step_complete
- on_assignment, on_submission

### REQ-HOOK-002: Step Hooks
Processing hooks:
- pre_process (AI prefill, data enrichment)
- post_process (validation, external calls)
- Sync and async execution

### REQ-HOOK-003: Hook Configuration
YAML-based registration:
- Per-project, per-workflow, per-step
- Handler references
- Config parameters

---

## REQ-PLUGIN: Plugin System

### REQ-PLUGIN-001: WASM Runtime
Sandboxed execution:
- wasmtime integration
- Memory limits
- CPU time limits
- Network restrictions

### REQ-PLUGIN-002: Plugin SDK
Development kit:
- TypeScript SDK
- Rust SDK
- WIT interface definitions
- Testing harness

### REQ-PLUGIN-003: Frontend Plugins
Browser-side extensions:
- Component registration
- Sandboxed loading
- Communication protocol

---

## REQ-API: Integration & API

### REQ-API-001: REST API
Full CRUD for all resources:
- OpenAPI 3.0 specification
- Versioned endpoints (/api/v1)
- Pagination, filtering, sorting
- Rate limiting

### REQ-API-002: WebSocket API
Real-time updates:
- Task assignments
- Workflow state changes
- Notifications

### REQ-API-003: Webhooks
Push notifications:
- Configurable endpoints
- Event filtering
- Retry with backoff
- Signature verification

### REQ-API-004: Airflow Integration
Pipeline connectivity:
- DAG trigger API
- Status callbacks
- Extensible interface for other orchestrators

---

## REQ-SEC: Security & Compliance

### REQ-SEC-001: Encryption
Data protection:
- TLS 1.3 in transit
- AES-256 at rest (database, storage)

### REQ-SEC-002: Secret Management
Secure configuration:
- Azure Key Vault integration
- No secrets in code/config
- Secret rotation support

### REQ-SEC-003: Input Validation
Defense in depth:
- Schema validation on all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)

### REQ-SEC-004: Audit Trail
Compliance logging:
- All mutations logged
- Immutable audit records
- Retention policies

---

## REQ-PERF: Non-Functional Requirements

### REQ-PERF-001: Response Time
API performance:
- p50 < 50ms
- p95 < 100ms
- p99 < 500ms

### REQ-PERF-002: Throughput
Capacity:
- 100k+ tasks per project
- 150+ concurrent users
- 1000+ annotations/minute

### REQ-PERF-003: Availability
Uptime target:
- 99.9% availability
- RTO < 4 hours
- RPO < 1 hour

### REQ-PERF-004: Scalability
Horizontal scaling:
- Stateless API servers
- Connection pooling
- Cache layers
