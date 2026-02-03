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

## Phase 3: Authentication ✅

**Goal**: Implement JWT authentication and Auth0 integration.

**Requirements Covered**: REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-004

**Completed**: 2026-01-28

### Deliverables
- [x] JWT token generation and validation
- [x] Refresh token rotation
- [x] Auth0 OAuth2/OIDC integration
- [x] Login/logout/callback endpoints
- [x] Auth middleware for protected routes
- [x] Current user extractor
- [x] Audit logging middleware
- [x] Session management

### Success Criteria
- [x] Auth0 login flow works end-to-end
- [x] Protected routes reject unauthenticated requests
- [x] Audit logs capture all auth events
- [x] Token refresh works correctly

---

## Phase 3.1: Style Guideline ✅

**Goal**: Build a comprehensive style guideline for Glyph with dark/light mode support and royal purple as the key brand color.

**Depends on**: Phase 3

**Completed**: 2026-01-31

### Deliverables
- [x] Design tokens (colors, spacing, typography, shadows)
- [x] Royal purple color palette with semantic variants
- [x] Dark mode color scheme
- [x] Light mode color scheme
- [x] Auto theme detection based on system preference
- [x] CSS custom properties for theming
- [x] Theme toggle component (optional manual override)
- [x] Component style patterns documentation
- [x] Updated index.css with design system

### Success Criteria
- [x] Theme switches automatically based on system preference
- [x] Royal purple is consistently used as primary brand color
- [x] All existing components work in both themes
- [x] Design tokens are documented and reusable

---

## Phase 4: User & Team Management ✅

**Goal**: Full user and team management with RBAC.

**Requirements Covered**: REQ-AUTH-003, REQ-USER-001 through REQ-USER-004

**Completed**: 2026-01-29

### Deliverables
- [x] User CRUD API
- [x] Skill management (add, certify, expire)
- [x] Role assignment API
- [x] Team CRUD API
- [x] Team membership management
- [x] RBAC permission checks
- [x] Quality profile tracking
- [x] FE: User profile page
- [x] FE: Team management UI
- [x] FE: Admin user management

### Success Criteria
- [x] Users can be created with skills and roles
- [x] Teams can be formed with leaders/members
- [x] Permission checks enforce RBAC
- [x] UI allows full user/team management

---

## Phase 4.1: UX Navigation Flow ✅

**Goal**: Ensure complete UX navigation flow from root (/) to all Phase 4 screens (users, teams, profiles).

**Depends on**: Phase 4

**Completed**: 2026-01-31

### Deliverables
- [x] Root route (/) with dashboard or landing page
- [x] Main navigation component (header/sidebar)
- [x] Navigation links to Users, Teams, Profile pages
- [x] Breadcrumb navigation for nested pages
- [x] Active state indicators for current route
- [x] Mobile-responsive navigation
- [x] Route protection for admin-only pages

### Success Criteria
- [x] User can navigate from / to all Phase 4 screens
- [x] Navigation shows current location
- [x] Admin pages are protected and hidden from non-admins
- [x] Navigation works on mobile devices

---

## Phase 4.2: Style Phase 4 Screens (INSERTED)

**Goal**: Apply the design system from Phase 3.1 to all Phase 4 screens (users, teams, profiles) for consistent theming.

**Depends on**: Phase 3.1, Phase 4.1

### Deliverables
- [ ] Apply design tokens to UserProfilePage
- [ ] Apply design tokens to UsersPage (admin)
- [ ] Apply design tokens to TeamsPage
- [ ] Apply design tokens to TeamDetailPage
- [ ] Style SkillBadges component with theme colors
- [ ] Style QualityStats component with theme colors
- [ ] Style UserTable with theme colors
- [ ] Style TeamTree with theme colors
- [ ] Style MemberList with theme colors
- [ ] Style AddMemberModal with theme colors
- [ ] Ensure dark/light mode works on all screens

### Success Criteria
- All Phase 4 screens use design tokens consistently
- Royal purple is visible as primary accent color
- Dark and light modes render correctly on all screens
- No hardcoded colors remain in Phase 4 components

---

## Phase 5: Project Management ✅

**Goal**: Project and project type configuration.

**Requirements Covered**: REQ-PROJ-001 through REQ-PROJ-003

**Completed**: 2026-02-02

### Deliverables
- [x] Project CRUD API
- [x] Project type CRUD API
- [x] Schema validation (task input, annotation output)
- [x] Skill requirement configuration
- [x] Data source configuration
- [x] Project status lifecycle
- [x] FE: Project list view
- [x] FE: Project creation wizard
- [x] FE: Project settings page

### Success Criteria
- [x] Projects can be created with types and schemas
- [x] Schema validation works for test payloads
- [x] Project lifecycle transitions work
- [x] UI supports full project management

---

## Phase 5.1: UX Navigation Flow for Phase 5 ✅

**Goal**: Ensure complete UX navigation flow from root (/) to all Phase 5 screens (projects, project types, data sources).

**Depends on**: Phase 5

**Completed**: 2026-02-02

Plans:
- [x] 05.1-01-PLAN.md — Fix breadcrumb cache lookup and add route labels
- [x] 05.1-02-PLAN.md — Create Project Types admin page with navigation
- [x] 05.1-03-PLAN.md — Add project-scoped sidebar navigation

### Deliverables
- [x] Navigation links to Projects list page
- [x] Navigation to Project creation wizard
- [x] Navigation to Project settings/detail page
- [x] Navigation to Project types management
- [x] Breadcrumb navigation for project hierarchy
- [x] Active state indicators for project routes
- [x] Project-scoped navigation (within a project context)

### Success Criteria
- [x] User can navigate from / to all Phase 5 screens
- [x] Navigation shows current project context
- [x] Breadcrumbs reflect project hierarchy
- [x] Project routes are accessible from main navigation

---

## Phase 5.2: Style Phase 5 Screens ✅

**Goal**: Apply the design system from Phase 3.1 to all Phase 5 screens (projects, project types, data sources) for consistent theming.

**Depends on**: Phase 3.1, Phase 5.1

**Completed**: 2026-02-02

### Deliverables
- [x] Apply design tokens to ProjectsPage (list view)
- [x] Apply design tokens to Project creation wizard
- [x] Apply design tokens to Project settings page
- [x] Apply design tokens to Project detail page
- [x] Style ProjectCard component with theme colors
- [x] Style ProjectTable component with theme colors
- [x] Style ProjectTypeSelector with theme colors
- [x] Style DataSourceConfig with theme colors
- [x] Ensure dark/light mode works on all Phase 5 screens

### Success Criteria
- [x] All Phase 5 screens use design tokens consistently
- [x] Royal purple is visible as primary accent color
- [x] Dark and light modes render correctly on all screens
- [x] No hardcoded colors remain in Phase 5 components

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
