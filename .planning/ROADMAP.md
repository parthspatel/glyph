# Glyph v1.0 Roadmap

> **Milestone**: v1.0 — Production-Ready Data Annotation Platform
> **Team**: 2 FE, 2 BE, 1 DevOps (AI deferred to v2)

---

## Phase Overview

| Phase | Name | Focus | Dependencies | Team Focus |
|-------|------|-------|--------------|------------|
| 1 | Foundation | Repo structure, CI/CD, base infrastructure | — | DevOps, BE |
| 2 | Core Domain | Domain models, database, API skeleton | Phase 1 | BE |
| 3 | Authentication | JWT, Auth0, RBAC | Phase 2 | BE |
| 4 | User & Team Management | Users, skills, teams, permissions | Phase 3 | BE, FE |
| 5 | Project Management | Projects, project types, data sources | Phase 4 | BE, FE |
| 6 | Workflow Engine | State machine, steps, transitions | Phase 5 | BE |
| 7 | Task Management | Tasks, assignments, queue | Phase 6 | BE, FE |
| 8 | Layout System | Nunjucks runtime, components, rendering | Phase 5 | FE |
| 9 | Annotation Interface | Annotation UI, submission flow | Phase 7, 8 | FE |
| 10 | Quality Management | Scoring, IAA metrics, evaluators | Phase 9 | BE |
| 11 | Dashboards | Annotator, team, project, admin views | Phase 10 | FE |
| 12 | Hooks & Plugins | WASM runtime, hook system | Phase 6 | BE |
| 13 | Export & Integration | Export system, webhooks, Airflow | Phase 10 | BE |
| 14 | Production Hardening | Security, performance, monitoring | Phase 11-13 | All |

---

## Phase 1: Foundation

**Goal**: Establish hybrid monorepo structure, CI/CD pipeline, and base infrastructure.

**Requirements Covered**: REQ-INFRA-001, REQ-INFRA-002, REQ-INFRA-005

### Deliverables
- [ ] Hybrid monorepo structure (apps/, libs/, packages/, infrastructure/)
- [ ] Workspace configuration (Cargo.toml, pnpm-workspace.yaml)
- [ ] GitHub Actions CI pipeline (build, test, lint)
- [ ] Docker multi-stage builds for Rust and Node
- [ ] devenv.nix updates for new structure
- [ ] Base logging and tracing setup
- [ ] Health check endpoints (/health, /ready)

### Success Criteria
- `cargo build` succeeds for all crates
- `pnpm build` succeeds for all packages
- CI pipeline runs on PR with <5 min build time
- Docker images build successfully

---

## Phase 2: Core Domain ✅

**Goal**: Implement all domain models, database schema, and API skeleton.

**Requirements Covered**: REQ-STORE-001, REQ-API-001 (partial)

**Completed**: 2026-01-28

### Deliverables
- [x] All domain types in libs/domain (matching PRD §2-§7)
- [x] SQLx migrations for all tables (users, teams, projects, workflows, tasks, annotations, quality)
- [x] Repository trait definitions
- [x] PostgreSQL repository implementations
- [x] Database connection pooling
- [x] Axum router skeleton with versioned routes (/api/v1)
- [x] OpenAPI spec generation setup (utoipa)
- [x] TypeScript type generation (typeshare)

### Success Criteria
- [x] All migrations run successfully
- [x] Domain types compile with full serde support
- [x] TypeScript types auto-generated
- [x] API skeleton returns 501 for unimplemented routes

---

## Phase 3: Authentication

**Goal**: Implement JWT authentication and Auth0 integration.

**Requirements Covered**: REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-004

**Plans:** 6 plans in 5 waves

Plans:
- [ ] 03-01-PLAN.md — Auth foundation (deps, config, errors)
- [ ] 03-02-PLAN.md — JWKS cache + JWT validation
- [ ] 03-03-PLAN.md — OIDC client (Auth0)
- [ ] 03-04-PLAN.md — Token cookies + CurrentUser extractor
- [ ] 03-05-PLAN.md — Auth endpoints (login/callback/logout/refresh)
- [ ] 03-06-PLAN.md — Audit logging

### Deliverables
- [ ] JWT token generation and validation
- [ ] Refresh token rotation
- [ ] Auth0 OAuth2/OIDC integration
- [ ] Login/logout/callback endpoints
- [ ] Auth middleware for protected routes
- [ ] Current user extractor
- [ ] Audit logging middleware
- [ ] Session management

### Success Criteria
- Auth0 login flow works end-to-end
- Protected routes reject unauthenticated requests
- Audit logs capture all auth events
- Token refresh works correctly

---

## Phase 4: User & Team Management

**Goal**: Full user and team management with RBAC.

**Requirements Covered**: REQ-AUTH-003, REQ-USER-001 through REQ-USER-004

### Deliverables
- [ ] User CRUD API
- [ ] Skill management (add, certify, expire)
- [ ] Role assignment API
- [ ] Team CRUD API
- [ ] Team membership management
- [ ] RBAC permission checks
- [ ] Quality profile tracking
- [ ] FE: User profile page
- [ ] FE: Team management UI
- [ ] FE: Admin user management

### Success Criteria
- Users can be created with skills and roles
- Teams can be formed with leaders/members
- Permission checks enforce RBAC
- UI allows full user/team management

---

## Phase 5: Project Management

**Goal**: Project and project type configuration.

**Requirements Covered**: REQ-PROJ-001 through REQ-PROJ-003

### Deliverables
- [ ] Project CRUD API
- [ ] Project type CRUD API
- [ ] Schema validation (task input, annotation output)
- [ ] Skill requirement configuration
- [ ] Data source configuration
- [ ] Project status lifecycle
- [ ] FE: Project list view
- [ ] FE: Project creation wizard
- [ ] FE: Project settings page

### Success Criteria
- Projects can be created with types and schemas
- Schema validation works for test payloads
- Project lifecycle transitions work
- UI supports full project management

---

## Phase 6: Workflow Engine

**Goal**: Core workflow engine with all step types and transitions.

**Requirements Covered**: REQ-WF-001 through REQ-WF-008

### Deliverables
- [ ] Workflow state machine implementation
- [ ] Step execution engine (annotation, review, adjudication)
- [ ] Auto-process step handler
- [ ] Conditional step evaluation
- [ ] Sub-workflow support
- [ ] Transition evaluation engine
- [ ] Consensus calculation (Kappa, Alpha)
- [ ] Resolution strategy execution
- [ ] Workflow YAML parser and validator
- [ ] Goal tracking engine
- [ ] Workflow event sourcing

### Success Criteria
- Single workflow executes correctly
- Multi-adjudication workflow with consensus works
- Custom DAG with conditions executes correctly
- Goals track progress accurately

---

## Phase 7: Task Management

**Goal**: Task lifecycle, assignment engine, and annotator queue.

**Requirements Covered**: REQ-TASK-001 through REQ-TASK-004, REQ-WF-005

### Deliverables
- [ ] Task CRUD API
- [ ] Task status lifecycle management
- [ ] Assignment engine (skill-based, load-balanced)
- [ ] Duplicate assignment prevention
- [ ] Cross-step exclusion
- [ ] Assignment accept/reject flow
- [ ] Task queue API with filtering/sorting
- [ ] WebSocket for real-time queue updates
- [ ] FE: Task queue view
- [ ] FE: Task detail view

### Success Criteria
- Tasks flow through workflow correctly
- Assignments respect skill requirements
- No duplicate assignments possible
- Queue updates in real-time

---

## Phase 8: Layout System

**Goal**: Nunjucks template rendering with component library.

**Requirements Covered**: REQ-LAYOUT-001 through REQ-LAYOUT-004

### Deliverables
- [ ] Nunjucks runtime integration (browser)
- [ ] Template security constraints
- [ ] Component registry
- [ ] Base annotation components (NERTagger, Classification, etc.)
- [ ] Layout primitives (Section, Grid, Box)
- [ ] Form components (Select, TextArea, Checkbox)
- [ ] Display components (TextDisplay, ImageViewer)
- [ ] Data binding (input, output, context)
- [ ] Layout schema validation
- [ ] Layout versioning system
- [ ] FE: Layout preview tool

### Success Criteria
- Clinical NER layout renders correctly
- Two-way binding works for annotations
- Components handle keyboard shortcuts
- Layout validation catches schema errors

---

## Phase 9: Annotation Interface

**Goal**: Complete annotator experience for creating annotations.

**Requirements Covered**: REQ-TASK-003, REQ-LAYOUT-001

### Deliverables
- [ ] Annotation page with layout rendering
- [ ] Draft auto-save
- [ ] Annotation submission flow
- [ ] Undo/redo support
- [ ] Keyboard shortcut system
- [ ] Progress indicator
- [ ] Skip task flow
- [ ] Previous annotations display
- [ ] FE: Review interface
- [ ] FE: Adjudication interface

### Success Criteria
- Complete annotation flow works end-to-end
- Draft saves prevent data loss
- Keyboard shortcuts improve efficiency
- Review/adjudication interfaces work

---

## Phase 10: Quality Management

**Goal**: Quality scoring, evaluation, and automated actions.

**Requirements Covered**: REQ-QUAL-001 through REQ-QUAL-005

### Deliverables
- [ ] Quality score storage and retrieval
- [ ] IAA evaluators (Cohen's Kappa, Krippendorff's Alpha, IoU)
- [ ] Gold standard management
- [ ] Blind gold insertion
- [ ] User quality profile aggregation
- [ ] Quality-based actions (auto-approve, reassign)
- [ ] Evaluation scheduling (async)
- [ ] Quality alerts
- [ ] FE: Quality dashboard components

### Success Criteria
- IAA metrics calculate correctly
- Gold standard accuracy tracks
- Quality actions trigger correctly
- Dashboard shows quality trends

---

## Phase 11: Dashboards

**Goal**: Role-specific dashboards for all user types.

**Requirements Covered**: REQ-DASH-001 through REQ-DASH-004

### Deliverables
- [ ] FE: Annotator dashboard (queue, stats, quality)
- [ ] FE: Team lead dashboard (team metrics, workload)
- [ ] FE: Project dashboard (goals, progress, quality)
- [ ] FE: System admin dashboard (overview, health)
- [ ] API: Dashboard data endpoints
- [ ] Real-time dashboard updates
- [ ] Export controls from project dashboard

### Success Criteria
- Each role sees appropriate dashboard
- Metrics update in near-real-time
- Drill-down navigation works
- Export functionality works

---

## Phase 12: Hooks & Plugins

**Goal**: Extensibility system with WASM plugins.

**Requirements Covered**: REQ-HOOK-001 through REQ-HOOK-003, REQ-PLUGIN-001 through REQ-PLUGIN-003

### Deliverables
- [ ] WASM runtime integration (wasmtime)
- [ ] WIT interface definitions
- [ ] Plugin loader and registry
- [ ] Resource limits (memory, CPU)
- [ ] Hook execution engine
- [ ] Sync and async hook support
- [ ] Plugin SDK (TypeScript)
- [ ] Plugin SDK (Rust)
- [ ] Example plugins (validation, enrichment)
- [ ] Frontend plugin loader

### Success Criteria
- WASM plugin executes in sandbox
- Hooks integrate with workflow
- Resource limits enforced
- Example plugins work correctly

---

## Phase 13: Export & Integration

**Goal**: Data export and external integrations.

**Requirements Covered**: REQ-STORE-003, REQ-STORE-004, REQ-API-002 through REQ-API-004

### Deliverables
- [ ] Streaming export API
- [ ] Export formats (JSON, JSONL, Parquet, CSV)
- [ ] S3 upload destination
- [ ] Webhook system (registration, delivery, retry)
- [ ] Event filtering for webhooks
- [ ] Signature verification
- [ ] Airflow DAG trigger integration
- [ ] Email notification service
- [ ] Data lifecycle policies

### Success Criteria
- Large exports stream without timeout
- Webhooks deliver with retry
- Airflow integration triggers correctly
- Email notifications send

---

## Phase 14: Production Hardening

**Goal**: Security, performance, and operational readiness.

**Requirements Covered**: REQ-INFRA-003, REQ-INFRA-004, REQ-SEC-001 through REQ-SEC-004, REQ-PERF-001 through REQ-PERF-004

### Deliverables
- [ ] Helm charts for all services
- [ ] Terraform for AKS infrastructure
- [ ] TLS configuration
- [ ] Secret management (Key Vault)
- [ ] Rate limiting
- [ ] Request validation hardening
- [ ] Performance profiling and optimization
- [ ] Load testing (100k tasks, 150 users)
- [ ] Monitoring dashboards (Grafana)
- [ ] Alerting rules
- [ ] Runbooks for operations
- [ ] Security audit

### Success Criteria
- Deploy to AKS succeeds
- Load test passes performance targets
- Security scan passes
- Monitoring covers all services

---

## Parallel Workstream Mapping

Given team composition (2 FE, 2 BE, 1 DevOps):

```
Phase 1:  [DevOps + BE1] ─────────────────────────────────────────►
Phase 2:            [BE1 + BE2] ──────────────────────────────────►
Phase 3:                   [BE1] ─────────────────────────────────►
Phase 4:                        [BE2] ────► [FE1 + FE2] ──────────►
Phase 5:                             [BE1] ────► [FE1] ───────────►
Phase 6:                                  [BE1 + BE2] ────────────►
Phase 7:                                        [BE2] ─► [FE2] ───►
Phase 8:                   [FE1 + FE2] ───────────────────────────►
Phase 9:                                              [FE1 + FE2] ►
Phase 10:                                       [BE1] ────────────►
Phase 11:                                                    [FE1 + FE2]
Phase 12:                                  [BE2] ─────────────────►
Phase 13:                                        [BE1] ───────────►
Phase 14: [DevOps] ─────────────────────────────────────────────► [All]
```

---

## Success Metrics for v1.0

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 100ms |
| Concurrent Users | 150+ |
| Task Capacity | 100k+ per project |
| Uptime | 99.9% |
| Build Time (CI) | < 10 min |
| Deploy Time | < 15 min |
| Test Coverage | > 80% |
