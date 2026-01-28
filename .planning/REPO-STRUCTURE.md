# Glyph Repository Structure

> Hybrid monorepo optimized for parallel team development (2 FE, 2 BE, 1 DevOps)

## Directory Layout

```
glyph/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Build, test, lint on PR
│   │   ├── release.yml            # Tag-based releases
│   │   └── deploy.yml             # Deployment workflows
│   ├── CODEOWNERS
│   └── pull_request_template.md
│
├── .planning/                     # GSD planning artifacts
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── config.json
│   ├── phases/
│   ├── todos/
│   └── research/
│
├── apps/                          # Deployable applications
│   ├── api/                       # Rust API server
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── config.rs
│   │       ├── routes/
│   │       │   ├── mod.rs
│   │       │   ├── auth.rs
│   │       │   ├── users.rs
│   │       │   ├── projects.rs
│   │       │   ├── tasks.rs
│   │       │   └── annotations.rs
│   │       ├── middleware/
│   │       │   ├── mod.rs
│   │       │   ├── auth.rs
│   │       │   ├── audit.rs
│   │       │   └── tracing.rs
│   │       └── extractors/
│   │
│   ├── worker/                    # Background job processor
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── jobs/
│   │       │   ├── mod.rs
│   │       │   ├── assignment.rs
│   │       │   ├── quality.rs
│   │       │   ├── export.rs
│   │       │   └── notification.rs
│   │       └── scheduler.rs
│   │
│   ├── cli/                       # Admin CLI tool
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       └── commands/
│   │
│   └── web/                       # React frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── routes/
│           ├── pages/
│           ├── components/
│           ├── hooks/
│           ├── stores/
│           ├── api/
│           └── styles/
│
├── libs/                          # Shared Rust libraries
│   ├── domain/                    # Core domain models
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── user.rs
│   │       ├── team.rs
│   │       ├── project.rs
│   │       ├── workflow.rs
│   │       ├── task.rs
│   │       ├── annotation.rs
│   │       ├── quality.rs
│   │       └── enums.rs
│   │
│   ├── db/                        # Database layer
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── pool.rs
│   │       ├── migrations.rs
│   │       └── repositories/
│   │           ├── mod.rs
│   │           ├── user.rs
│   │           ├── project.rs
│   │           ├── task.rs
│   │           └── annotation.rs
│   │
│   ├── workflow-engine/           # Workflow state machine
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── engine.rs
│   │       ├── state.rs
│   │       ├── steps/
│   │       ├── transitions.rs
│   │       ├── consensus.rs
│   │       └── goals.rs
│   │
│   ├── quality/                   # Quality scoring engine
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── evaluators/
│   │       │   ├── mod.rs
│   │       │   ├── kappa.rs
│   │       │   ├── alpha.rs
│   │       │   ├── iou.rs
│   │       │   └── gold.rs
│   │       ├── profiles.rs
│   │       └── actions.rs
│   │
│   ├── plugins/                   # WASM plugin runtime
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── runtime.rs
│   │       ├── loader.rs
│   │       ├── sandbox.rs
│   │       └── wit/
│   │
│   ├── auth/                      # Authentication library
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── jwt.rs
│   │       ├── auth0.rs
│   │       ├── rbac.rs
│   │       └── audit.rs
│   │
│   └── common/                    # Shared utilities
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── error.rs
│           ├── config.rs
│           ├── telemetry.rs
│           └── time.rs
│
├── packages/                      # TypeScript packages
│   ├── @glyph/types/              # Generated types from Rust
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── generated.ts       # typeshare output
│   │
│   ├── @glyph/api-client/         # API client SDK
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       └── endpoints/
│   │
│   ├── @glyph/components/         # Shared React components
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── annotation/
│   │       │   ├── NERTagger.tsx
│   │       │   ├── Classification.tsx
│   │       │   └── BoundingBox.tsx
│   │       ├── layout/
│   │       ├── form/
│   │       └── display/
│   │
│   ├── @glyph/layout-runtime/     # Nunjucks layout engine
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── renderer.ts
│   │       ├── components.ts
│   │       ├── bindings.ts
│   │       └── security.ts
│   │
│   └── @glyph/plugin-sdk/         # Plugin development SDK
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           └── host.ts
│
├── infrastructure/                # IaC and deployment
│   ├── helm/
│   │   ├── glyph/                 # Main umbrella chart
│   │   │   ├── Chart.yaml
│   │   │   ├── values.yaml
│   │   │   ├── values-dev.yaml
│   │   │   ├── values-prod.yaml
│   │   │   └── templates/
│   │   ├── api/
│   │   ├── worker/
│   │   └── web/
│   │
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── aks/
│   │   │   ├── postgresql/
│   │   │   ├── redis/
│   │   │   ├── storage/
│   │   │   └── keyvault/
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   └── prod/
│   │   └── main.tf
│   │
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── worker.Dockerfile
│   │   ├── web.Dockerfile
│   │   └── docker-compose.yml     # Local development
│   │
│   └── k3s/                       # Local k3s configs
│       └── dev-cluster.yaml
│
├── migrations/                    # SQL migrations
│   ├── 0001_create_enums.sql
│   ├── 0002_create_users.sql
│   ├── 0003_create_projects.sql
│   ├── 0004_create_tasks.sql
│   ├── 0005_create_annotations.sql
│   ├── 0006_create_quality.sql
│   └── ... 
│
├── layouts/                       # Nunjucks layout templates
│   ├── base/
│   ├── clinical-ner-v1/
│   ├── classification-v1/
│   ├── macros/
│   └── partials/
│
├── plugins/                       # Example plugins
│   ├── validation-example/
│   └── enrichment-example/
│
├── tools/                         # Development tools
│   ├── typegen/                   # Rust → TypeScript generator
│   └── scripts/
│       ├── setup.sh
│       ├── migrate.sh
│       └── seed.sh
│
├── docs/
│   ├── design/
│   │   ├── product-requirements.md
│   │   └── PRD-CHEATSHEET.md
│   ├── api/                       # Generated OpenAPI docs
│   ├── architecture/
│   └── operations/
│
├── Cargo.toml                     # Workspace root
├── Cargo.lock
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── devenv.nix
├── devenv.yaml
├── devenv.lock
├── .envrc
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Workspace Configuration

### Cargo.toml (Root)

```toml
[workspace]
resolver = "2"
members = [
    "apps/api",
    "apps/worker", 
    "apps/cli",
    "libs/domain",
    "libs/db",
    "libs/workflow-engine",
    "libs/quality",
    "libs/plugins",
    "libs/auth",
    "libs/common",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Glyph Team"]
license = "MIT"

[workspace.dependencies]
# ... shared dependencies
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/web'
  - 'packages/*'
```

## Team Ownership

| Directory | Primary Owner | Secondary |
|-----------|---------------|-----------|
| apps/api | BE Team | — |
| apps/worker | BE Team | — |
| apps/web | FE Team | — |
| libs/domain | BE Team | — |
| libs/db | BE Team | — |
| libs/workflow-engine | BE Team | — |
| libs/quality | BE Team | — |
| libs/plugins | BE Team | — |
| libs/auth | BE Team | — |
| packages/@glyph/components | FE Team | — |
| packages/@glyph/layout-runtime | FE Team | — |
| infrastructure/ | DevOps | BE Team |
| migrations/ | BE Team | — |
| layouts/ | FE Team | BE Team |

## Build Commands

```bash
# Rust
cargo build                    # Build all Rust crates
cargo test                     # Test all Rust crates
cargo clippy                   # Lint all Rust crates

# TypeScript
pnpm install                   # Install all dependencies
pnpm build                     # Build all packages
pnpm test                      # Test all packages
pnpm typecheck                 # Type check all packages

# Type Generation
pnpm typegen                   # Generate TS types from Rust

# Docker
docker compose up              # Start local dev environment
docker compose build           # Build all images

# Migrations
sqlx migrate run               # Run pending migrations

# Full CI
./tools/scripts/ci.sh          # Run full CI locally
```

## Migration from Current Structure

Current structure needs these changes:

1. **Move** `crates/` → `apps/` and `libs/` (split apps from libs)
2. **Move** `packages/@glyph/` → `packages/` (flatten)
3. **Move** `packages/web/` → `apps/web/`
4. **Create** `infrastructure/` with helm/terraform
5. **Update** Cargo.toml workspace members
6. **Update** pnpm-workspace.yaml paths
7. **Update** import paths in all code

This will be done in Phase 1.
